
## Architecture Decisions

- **Database:** Chosen **SQLite** for zero-configuration deployment and portability, making it ideal for this assignment and local development. The schema uses standard relational patterns with Foreign Keys to ensure data integrity.
- **Backend Pattern:** Used **Controller-Service** pattern (simplified into Routes/Config) to separate concerns. Database logic is wrapped in a Promise-based helper to maintain modern `async/await` syntax while using the efficient `better-sqlite3` driver.
- **Distance Logic:** Implemented the Haversine formula on both Frontend (for immediate user feedback/warnings) and Backend (for reliable data storage and validation). This "Dual Validation" approach improves UX while maintaining data integrity.
- **Reporting:** Designed the Daily Summary API to use a single optimized SQL query with `LEFT JOIN`s to fetch all data at once, preventing the "N+1 Query Problem" where the server would otherwise query the database for every single employee.
