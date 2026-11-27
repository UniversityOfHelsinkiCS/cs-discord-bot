# /create_course

Creates a course: a category with announcement, general and voice channels, a course role and an instructor role. You become an instructor of the course, and it is added to `#guide`.

- **Who:** Faculty and admins
- **Where:** Any channel
- **Confirmation:** No

| Argument | Required | Description |
| --- | --- | --- |
| `coursecode` | Yes | The course code, e.g. TKT10001. |
| `full_name` | Yes | The full course name. Must be unique. |
| `nick_name` | No | A short name shown in the channel list. Defaults to the course code. Must be unique. |

Names can't contain emojis, and the code and nickname can't contain `%`.
