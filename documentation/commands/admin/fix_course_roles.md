# /fix_course_roles

Reconciles course memberships between Discord and the database.

- **Who:** Admins
- **Where:** Any channel
- **Confirmation:** No

For every member and every course:

- A member with the `<course> instructor` role but not the `<course>` role gets the `<course>` role.
- A member with the `<course>` role but no course membership in the database gets one.
- The membership's `instructor` flag is set to match whether the member has the `<course> instructor` role.
- A membership whose member has neither role is deleted. Members who have left the server are not touched here; [/prune_users](./prune_users.md) handles them.

The reply lists every fix, or says `No course role mismatches found.`
