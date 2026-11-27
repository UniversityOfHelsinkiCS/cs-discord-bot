# /server_status

Compares the server with the database and lists every mismatch.

- **Who:** Admins
- **Where:** Any channel
- **Confirmation:** No

It checks:
- that each course category exists, with the right name and permissions
- that each course channel exists, with the right name and category
- that each course has its course and instructor roles
- that the admin and faculty roles exist
- channels on the server that are not in the database
