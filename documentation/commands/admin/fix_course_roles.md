## !fix_course_roles

- :heavy_check_mark: Can be used only in the #commands text channel.
- :heavy_check_mark: Reacts to the command with ✅ if command succeeded, and with ❌ if didn't succeed.

- :x: All members can use this command.
- :x: Needs arguments.

Reconciles course membership between Discord and the database. For every guild member and every course:

- If the member has the `<course> instructor` role but not the `<course>` role, the `<course>` role is added.
- If the member has the `<course>` role but no course membership row in the database, one is created.
- The `instructor` flag on the database row is set to match whether the member has the `<course> instructor` role (so it is also cleared when the instructor role has been removed).
- If the member has neither the `<course>` nor the `<course> instructor` role but still has a course membership row in the database, that row is removed. Members who have left the server are left untouched (that is handled by user pruning).

The command replies with a list of every fix it made, or `No course role mismatches found.` if there was nothing to do.
