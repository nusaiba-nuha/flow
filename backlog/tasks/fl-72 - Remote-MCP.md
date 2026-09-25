---
id: FL-72
title: Remote MCP
status: Done
assignee:
  - '@pi'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 17:51'
labels:
  - server
  - mcp
milestone: m-0
dependencies:
  - FL-71
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The MCP tools over HTTP, so an agent in the cloud can read and update hosted diagrams (today `isketch mcp` is stdio and local only).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 An HTTP MCP endpoint on the server exposes list, read (brief or text), write, render and diff for hosted diagrams
- [x] #2 Writes need the diagram edit token; reads need only the link
- [x] #3 README has a setup line for a remote MCP client
- [x] #4 Tests cover the endpoint against PostgreSQL

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

AC evidence lives on main: server/src/mcp/mcp.controller.ts + server/test/mcp.test.ts (PostgreSQL), README 'same tools over HTTP' section, checked against the official MCP SDK client per commit 0978f86.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Remote MCP shipped on main in PR #72 (commit 0978f86): POST /mcp speaks Streamable HTTP sharing protocol code with the local stdio server (src/mcp/protocol.js), read by link, publish/update with edit token, tool errors carry line numbers, verified with the official MCP SDK client and server tests against PostgreSQL; README documents the remote client setup. A second implementation started locally was closed as a duplicate (PR #73).
<!-- SECTION:FINAL_SUMMARY:END -->
