const request = require('supertest');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

// Mock dependencies
jest.mock('../config/database');
jest.mock('../middleware/auth');

// Import app AFTER mocking
const app = require('../server');

describe('GET /api/reports/daily-summary', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mock for auth middlewares
        authenticateToken.mockImplementation((req, res, next) => {
            req.user = { id: 1, role: 'manager' };
            next();
        });
        
        requireManager.mockImplementation((req, res, next) => {
            if (req.user.role !== 'manager') {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
            next();
        });
    });

    it('should return 400 if date is missing', async () => {
        const res = await request(app).get('/api/reports/daily-summary');
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/Date parameter is required/);
    });

    it('should return 400 if date format is invalid', async () => {
        const res = await request(app).get('/api/reports/daily-summary?date=invalid-date');
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/Invalid date format/);
    });

    it('should return 403 for non-manager users', async () => {
        // Override auth mock for this test
        authenticateToken.mockImplementation((req, res, next) => {
            req.user = { id: 2, role: 'employee' };
            next();
        });

        const res = await request(app).get('/api/reports/daily-summary?date=2023-10-27');
        expect(res.statusCode).toBe(403);
    });

    it('should return 200 and report data for valid request', async () => {
        // Mock DB response
        const mockRows = [
            {
                employee_id: 1,
                employee_name: 'John Doe',
                employee_email: 'john@example.com',
                checkin_id: 101,
                client_id: 5,
                client_name: 'Client A',
                checkin_time: '2023-10-27 09:00:00',
                checkout_time: '2023-10-27 17:00:00',
                distance_from_client: 0.5,
                notes: 'Test note',
                status: 'checked_out'
            }
        ];
        pool.execute.mockResolvedValue([mockRows]);

        const res = await request(app).get('/api/reports/daily-summary?date=2023-10-27');
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.team_summary.total_employees).toBe(1);
        expect(res.body.data.employee_breakdown[0].employee_name).toBe('John Doe');
        
        // Verify DB was called correctly
        expect(pool.execute).toHaveBeenCalled();
        const sqlCall = pool.execute.mock.calls[0][0];
        expect(sqlCall).toContain('SELECT');
        expect(sqlCall).toContain('FROM users');
    });

    it('should handle database errors gracefully', async () => {
        pool.execute.mockRejectedValue(new Error('DB Error'));
        
        const res = await request(app).get('/api/reports/daily-summary?date=2023-10-27');
        
        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
    });
});
