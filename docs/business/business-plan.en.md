---
title: SEO Analyzer Business Plan
lang: en
status: approved
version: 0.2
updated: 2026-10-09
---

# Business Plan

## Problem

Persian online stores often cannot identify which content or technical SEO problems matter most, where competitors perform better, or whether changes result in measurable progress. Manually creating titles, meta descriptions, keywords, and slugs is also slow and inconsistent for large catalogs.

## Solution

A project-oriented API that captures business scope, responsibly crawls the owner's properties and approved competitors, creates a baseline, measures changes, and produces a trackable action plan. Product SEO metadata generation is part of the MVP.

## MVP customers

- Technical teams at Iranian online stores
- Store and plugin developers
- Web development companies
- SEO agencies capable of integrating an API

Stores without technical staff are deferred until a dashboard or ready-made integration exists.

## Value proposition

- Persian, commerce-focused analysis
- Comparison against user-approved competitors
- Measurable progress from a baseline
- Explainable component scores instead of one opaque number
- Prioritized action plans
- Stable integration API
- A rules-first core that does not depend on AI

## MVP scope

- Organizations, workspaces, and SEO projects
- Structured scope onboarding
- A primary domain, subdomains, and multiple competitor properties
- Manual, weekly, and monthly crawls
- HTML-first crawling with a constrained headless fallback
- Product and category page analysis
- Metadata, headings, canonical, indexability, structured data, images, links, and status analysis
- Baselines, snapshots, versioned scores, and site-level competitor comparison
- Action items with independent user and technical verification states
- Versioned title, meta, keyword, and slug suggestions
- Workspace API keys scoped by permissions and projects
- Polling and signed webhooks
- Deletable history and audit logs for important actions

## MVP cost position

The MVP uses no paid SEO, SERP, or AI service. Core analysis is rule-based. AI is optional through a local model or a user-owned API key. This removes third-party tool fees but not compute and storage costs, so access is controlled through a waitlist and administrator approval.

## Future business model

Plans will include quotas for projects, competitors, pages, scheduled crawls, history, and AI generation. Extra usage will consume credits. The MVP records usage but has no payment or subscription model.

## Success metric

The target is 100 active beta users. An active user must create an approved project, complete a successful crawl, review the action plan, and either run another crawl or configure a schedule.

## Main risks

- Crawl and headless rendering infrastructure cost
- Incorrect competitor or page-type detection
- Accidental load on target websites
- Misleading scoring
- AI or provider dependency
- Uncontrolled snapshot growth

## Investment gate

Further investment is justified when users return, act on recommendations, show measurable improvement in subsequent crawls, and demonstrate real willingness to pay.

[Persian version](business-plan.fa.md)
