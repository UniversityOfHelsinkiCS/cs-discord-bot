# Terms of Service — CS Discord Bot

*Last updated: 2 September 2026. Full change history: https://github.com/UniversityOfHelsinkiCS/cs-discord-bot/commits/main/TERMS_OF_SERVICE.md*

These Terms of Service ("Terms") govern your use of the CS Discord Bot ("the Bot"), a private bot operated for a specific Discord community ("the Server"). The Bot is developed and run by the University of Helsinki's software development team (Toska) together with a contracted Discord administrator/developer, on behalf of the Department of Computer Science ("the Operator"). By using the Bot's commands or its companion website, you agree to these Terms.

The Bot's moderation features may also process messages from any member of the Server, whether or not that member has used a command. That processing is carried out on the legal bases set out in the [Privacy Policy](./PRIVACY_POLICY.md), not on your acceptance of these Terms.

These Terms apply alongside Discord's own Terms of Service and Community Guidelines, which remain in effect at all times. In the event of a conflict, Discord's Terms take precedence.

---

## 1. Scope and Eligibility

The Bot is a private service made available exclusively to current members of the Server. It is not a public product and is not offered to any other Discord server, community, or individual.

You are eligible to use the Bot if you are a member of the Server and are at least 13 years old, consistent with Discord's minimum age requirement and with the age of consent for information-society services under Finnish data-protection law. The Server is primarily intended for university students and staff, but some courses (e.g., MOOCs) are open to the public, so participants below university age may occasionally be members, provided they meet the 13+ minimum. No separate age verification is performed.

---

## 2. Permitted Use

You may interact with the Bot through:

- Commands and interactions within the Server's Discord channels.
- The Bot's companion website, used for faculty verification and course-join links.

All use must be consistent with the purpose of the Server — course management, community communication, and related academic activities.

---

## 3. Prohibited Use

You may not:

- Abuse, exploit, overload, or probe the security of this running instance of the Bot or its underlying infrastructure. (Reading, studying, and testing the open-source code under its licence is expressly permitted — see section 4.)
- Use the Bot to violate Discord's Terms of Service or Community Guidelines.
- Use the Bot to harass, spam, or harm other members of the Server.
- Attempt to extract, scrape, or misuse data the Bot processes about other people. (This does not restrict requests for your own data or the exercise of your data-protection rights under the Privacy Policy.)
- Invite this specific Bot instance to any other server. The Bot's token and deployment are private and restricted to the Server.
- Attempt to access or tamper with the Bot's database, credentials, infrastructure, or administrative functions without authorisation.

If you discover a security vulnerability, please report it privately (see section 10) rather than exploiting or publicly disclosing it.

---

## 4. Bot Instance vs. Source Code

The source code for the Bot is publicly available on GitHub (https://github.com/UniversityOfHelsinkiCS/cs-discord-bot) and is licensed under the [MIT License](https://github.com/UniversityOfHelsinkiCS/cs-discord-bot/blob/main/LICENSE). You are free to read, fork, and self-host the code under the terms of that licence.

However, this specific running instance of the Bot — including its Discord bot token, database, configuration, and deployment — is private and restricted to the Server. No right to operate, replicate, or transfer this Bot instance is granted by these Terms or by the MIT licence covering the source code.

---

## 5. Data and Privacy

The Bot collects and processes certain data about Server members as described in the [Privacy Policy](./PRIVACY_POLICY.md), which is incorporated into these Terms by reference.

### 5.1 Nature of stored data

The data stored in the Bot's database about you — your Discord user ID, your Discord account username, and flags for whether you hold the Server's admin or faculty role — is derived from information already visible to any member of the Server (e.g., by clicking a user's Discord profile). The database also records which course roles you hold, as a link between your user record and each course. Separately, it stores course and channel structure records (course codes and names, Discord category and channel IDs, and flags such as hidden or locked); these do not describe individual users. No private or sensitive personal information such as email addresses, passwords, or payment details is collected or stored.

Although each individual field mirrors information shown on a member's Discord profile, the database as a whole is a persistent, queryable compilation of who is on the Server, under what username, in which courses, and with what privileges. Because that compilation carries more risk than the same facts glanced at in the client, your Discord user ID and username - and the website session store - are encrypted at rest at the application level with AES-256-GCM; see the [Privacy Policy](./PRIVACY_POLICY.md) for what this does and does not protect. Data in transit between the Bot and Discord's API is protected by TLS/HTTPS as standard.

### 5.2 Your rights

You may request access to, correction of, or deletion of your data by contacting a server administrator or opening an issue on the GitHub repository. For formal data-protection requests you may also contact the person responsible for register matters, Matti Luukkainen (matti.luukkainen@helsinki.fi) or the University of Helsinki Data Protection Officer (tietosuoja@helsinki.fi). EU/EEA residents may exercise rights under the GDPR as described in the Privacy Policy, including the right to lodge a complaint with the Office of the Data Protection Ombudsman (Tietosuojavaltuutetun toimisto, https://tietosuoja.fi). You can also ask a human administrator to review any automated moderation action taken against you (see section 6); the Privacy Policy explains why we offer this even though we consider Article 22 GDPR not to apply.

---

## 6. Moderation and Access

Server administrators and moderators may restrict, suspend, or remove your access to the Bot or the Server at their discretion, including for violations of these Terms, the Server's own rules, or Discord's Terms of Service.

The Bot also takes automated moderation actions. It may flag or delete suspected spam and scam messages, and in defined anti-scam and anti-spam cases it may remove a member automatically and without prior human review — as a ban immediately followed by an unban, which acts as a kick and also removes up to about 24 hours of that account's recent messages. These removals are reversible: you are not permanently banned and may rejoin. Automated actions are not a substitute for human moderation and may occasionally be in error; if you believe an action was incorrect, contact an administrator, who can review it. See the Privacy Policy for details of this automated processing.

---

## 7. Availability, Warranties, and Liability

The Bot is maintained by the University of Helsinki's Toska development team and a contracted administrator, on a best-effort basis, free of charge. No uptime guarantee is given, and the Bot may be taken offline, modified, or discontinued at any time without prior notice.

The Bot is provided *as-is*, without warranty of any kind. To the fullest extent permitted by applicable law, the Operator is not liable for loss or damage — including data loss or service interruption — arising from your use of, or inability to use, the Bot. Where an automated moderation action is wrong, the remedy is the human review and correction described in section 6 and in the Privacy Policy; those actions are deliberately reversible so that any resulting harm stays minimal. Nothing in these Terms limits or excludes liability that cannot be limited or excluded under mandatory applicable law, including liability for personal injury caused by negligence or for intentional or grossly negligent conduct.

---

## 8. Governing Law

These Terms are governed by the laws of Finland, without regard to conflict-of-law principles. The courts of Helsinki, Finland (Helsingin käräjäoikeus) have jurisdiction over any dispute, except where mandatory law gives you the right to bring proceedings in, or requires application of the consumer-protection law of, your country of residence. Those mandatory rights are unaffected by these Terms.

---

## 9. Changes to These Terms

These Terms may be updated as the Bot's features change or as required. Material changes will be announced in the Server. The date at the top of this document reflects the current version. Continued use of the Bot after a change is announced constitutes your acceptance of the updated Terms.

The current version of these Terms is always available in the Server and on the GitHub repository.

---

## 10. Contact

If you have questions about these Terms, contact a server administrator or moderator in the Server, or open an issue at https://github.com/UniversityOfHelsinkiCS/cs-discord-bot. For data-protection matters you may also contact the person responsible for register matters, Matti Luukkainen (matti.luukkainen@helsinki.fi), or the University of Helsinki Data Protection Officer at tietosuoja@helsinki.fi.

To report a security vulnerability, please contact a server administrator privately or open a GitHub security advisory at the repository above; do not disclose the issue publicly or attempt to exploit it.
