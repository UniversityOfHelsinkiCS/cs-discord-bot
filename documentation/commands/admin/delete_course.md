# /delete_course

Deletes a course: its category, channels, roles and database records. Members left with no courses and no admin or faculty rights have their user records deleted too.

- **Who:** Admins
- **Where:** Any channel
- **Confirmation:** Yes

| Argument | Required | Description |
| --- | --- | --- |
| `course_name` | Yes | The course to delete. Autocompletes with all courses. |
