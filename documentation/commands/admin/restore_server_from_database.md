# /restore_server_from_database

Rebuilds the server's courses from the database, for when the server has been changed by hand in a way that is hard to undo.

- **Who:** Admins
- **Where:** Any channel
- **Confirmation:** Yes, twice

It:
- creates missing course categories, restores their names and positions, and creates missing course and instructor roles
- creates missing course channels and restores their names and categories
- sets channel permissions according to each course's lock status
- restores admin and faculty roles
- restores course and instructor roles
- deletes channels inside course categories that are not in the database
