# Tailscale policy file — corrected

Two steps, in this order:

1. **Replace the whole policy file** at [Access Controls](https://login.tailscale.com/admin/acls/file) with the block below, and save.
2. **Tag homepc-1**: [Machines](https://login.tailscale.com/admin/machines) → `homepc-1` → ⋯ menu → **Edit ACL tags** → add `tag:server` → save.

Then test from Hanh's laptop: `ssh tuana@homepc-1 'hostname'` → should print `homepc-1`.

> Why the tag: Tailscale doesn't allow one user's devices in another user's SSH rule, so homepc-1 gets a `tag:server` label and the rule targets the tag. Tagging also disables key expiry on homepc-1 (good — the production box can't silently drop off the tailnet). Your own access keeps working via the second SSH rule.

```jsonc
// Tailnet policy. Changes from the default: tag:server defined and used to
// grant SSH access to homepc-1 (as user tuana) for both Anh and Hanh.
{
    // Declare static groups of users. Use autogroups for all users or users with a specific role.
    // "groups": {
    //      "group:example": ["alice@example.com", "bob@example.com"],
    // },

    // Define the tags which can be applied to devices and by which users.
    "tagOwners": {
        "tag:server": ["autogroup:admin"],
    },

    // Define grants that govern access for users, groups, autogroups, tags,
    // Tailscale IP addresses, and subnet ranges.
    "grants": [
        // Allow all connections.
        // Comment this section out if you want to define specific restrictions.
        {"src": ["*"], "dst": ["*"], "ip": ["*"]},
    ],

    // Define users and devices that can use Tailscale SSH.
    "ssh": [
        // Allow all users to SSH into their own devices in check mode.
        {
            "action": "check",
            "src":    ["autogroup:member"],
            "dst":    ["autogroup:self"],
            "users":  ["autogroup:nonroot", "root"],
        },
        // Anh + Hanh can SSH into tagged servers (homepc-1) as user tuana.
        // Anh is listed explicitly because tagging homepc-1 moves it out of
        // his "own devices", so the rule above no longer covers it.
        {
            "action": "accept",
            "src":    ["tuananhtrinh919@gmail.com", "hanhbh.213@gmail.com"],
            "dst":    ["tag:server"],
            "users":  ["tuana"],
        },
    ],

    "nodeAttrs": [
        {
            // Funnel policy, which lets tailnet members control Funnel
            // for their own devices.
            // Learn more at https://tailscale.com/kb/1223/tailscale-funnel/
            "target": ["autogroup:member"],
            "attr":   ["funnel"],
        },
    ],
}
```
