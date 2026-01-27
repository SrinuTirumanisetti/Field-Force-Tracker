const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/daily-summary
// Get daily summary report for manager's team
router.get('/daily-summary', authenticateToken, requireManager, async (req, res) => {
    try {
        const { date, employee_id } = req.query;

        // Validate date parameter
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required (YYYY-MM-DD format)'
            });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Build query with optional employee filter
        let employeeFilter = '';
        const params = [req.user.id, date, date];

        if (employee_id) {
            employeeFilter = ' AND u.id = ?';
            params.push(employee_id);
        }

        // Single efficient query to get all data
        const [checkins] = await pool.execute(
            `SELECT 
                u.id as employee_id,
                u.name as employee_name,
                u.email as employee_email,
                ch.id as checkin_id,
                ch.client_id,
                c.name as client_name,
                ch.checkin_time,
                ch.checkout_time,
                ch.distance_from_client,
                ch.notes,
                ch.status
             FROM users u
             LEFT JOIN checkins ch ON u.id = ch.employee_id 
                AND DATE(ch.checkin_time) = ?
             LEFT JOIN clients c ON ch.client_id = c.id
             WHERE u.manager_id = ?${employeeFilter}
             ORDER BY u.id, ch.checkin_time`,
            employee_id ? [date, req.user.id, employee_id] : [date, req.user.id]
        );

        // Process data into employee breakdown
        const employeeMap = new Map();
        let totalCheckins = 0;
        let totalHours = 0;
        const uniqueClients = new Set();

        checkins.forEach(row => {
            if (!employeeMap.has(row.employee_id)) {
                employeeMap.set(row.employee_id, {
                    employee_id: row.employee_id,
                    employee_name: row.employee_name,
                    employee_email: row.employee_email,
                    checkins_count: 0,
                    working_hours: 0,
                    clients_visited: new Set(),
                    checkins: []
                });
            }

            const employee = employeeMap.get(row.employee_id);

            if (row.checkin_id) {
                employee.checkins_count++;
                totalCheckins++;
                employee.clients_visited.add(row.client_id);
                uniqueClients.add(row.client_id);

                // Calculate working hours if checked out
                if (row.checkout_time) {
                    const checkinTime = new Date(row.checkin_time);
                    const checkoutTime = new Date(row.checkout_time);
                    const hours = (checkoutTime - checkinTime) / (1000 * 60 * 60);
                    employee.working_hours += hours;
                    totalHours += hours;
                }

                employee.checkins.push({
                    id: row.checkin_id,
                    client_name: row.client_name,
                    checkin_time: row.checkin_time,
                    checkout_time: row.checkout_time,
                    distance_from_client: row.distance_from_client,
                    notes: row.notes,
                    status: row.status
                });
            }
        });

        // Convert map to array and format
        const employeeBreakdown = Array.from(employeeMap.values()).map(emp => ({
            employee_id: emp.employee_id,
            employee_name: emp.employee_name,
            employee_email: emp.employee_email,
            checkins_count: emp.checkins_count,
            working_hours: Math.round(emp.working_hours * 100) / 100,
            clients_visited: emp.clients_visited.size,
            checkins: emp.checkins
        }));

        // Count active employees (those with at least one check-in)
        const activeEmployees = employeeBreakdown.filter(emp => emp.checkins_count > 0).length;

        res.json({
            success: true,
            data: {
                date: date,
                team_summary: {
                    total_employees: employeeBreakdown.length,
                    active_employees: activeEmployees,
                    total_checkins: totalCheckins,
                    total_hours: Math.round(totalHours * 100) / 100,
                    unique_clients: uniqueClients.size
                },
                employee_breakdown: employeeBreakdown
            }
        });

    } catch (error) {
        console.error('Daily summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate daily summary' });
    }
});

module.exports = router;
