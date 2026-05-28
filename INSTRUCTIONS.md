# **# Wandr — AI Development Instructions**

# 

# **This document defines the development priorities and how tasks should be approached.**

# Visit TODO.txt for current list of tasks. This should be updated when finished. 

# Export all results to me as zips of the whole project, unless minor fixes. 

# **---**

# 

# **# PRIORITY ORDER (STRICT)**

# 

# **## 1. Bug Fixes (HIGHEST PRIORITY)**

# **Fix all existing issues before adding or redesigning anything.**

# 

# **### Approach Rules:**

# **- Do not introduce new features while bugs exist in the same system area**

# **- If a bug is caused by unclear architecture, mark it and refactor first instead of patching repeatedly**

# **- Always prioritise stability over visual improvements**

# 

# **### Examples:**

# **- broken dropdowns**

# **- map layer glitches**

# **- incorrect UI behaviour**

# **- broken routing logic**

# 

# **### Goal:**

# **System must be fully stable before scaling features.**

# 

# **---**

# 

# **## 2. UI / UX (SECOND PRIORITY)**

# **Only improve UI once core systems are stable.**

# 

# **### Approach Rules:**

# **- UI changes must not break backend logic**

# **- Prefer modular UI components (reusable elements)**

# **- Avoid redesigning multiple systems at once**

# 

# **### Best Practice:**

# **- Start with layout structure first**

# **- Then improve visual styling**

# **- Then add interactions last**

# 

# **### Goal:**

# **Make the product feel modern, minimal, and intuitive without increasing complexity.**

# 

# **---**

# 

# **## 3. Backend Architecture (THIRD PRIORITY)**

# **This is the foundation for scalability and all future features.**

# 

# **### Approach Rules:**

# **- Design before implementing**

# **- Avoid feature-specific hardcoding**

# **- Prefer scalable data models over quick fixes**

# 

# **### Key Systems to Structure Properly:**

# **- users \& authentication**

# **- pins / locations data model**

# **- routes system**

# **- reviews \& media storage**

# **- admin moderation layer**

# 

# **### Important:**

# **If a feature requires backend changes:**

# **- design the backend first**

# **- implement API endpoints next**

# **- then connect frontend last**

# 

# **### Goal:**

# **Create a stable, extensible system that supports long-term growth.**

# 

# **---**

# 

# **## 4. New Features (FOURTH PRIORITY)**

# **Only build features after backend + UI foundations are stable.**

# 

# **### CRITICAL RULES FOR NEW FEATURES**

# 

# **#### 1. Dependency Awareness**

# **Before building anything:**

# **- check if backend structure supports it**

# **- check if UI system can display it cleanly**

# **- check if it overlaps existing features**

# 

# **If not:**

# **- refactor first**

# **- do NOT force implementation**

# 

# **---**

# 

# **#### 2. Build Order for Each Feature**

# **Always follow this sequence:**

# 

# **1. Data model design**

# **2. Backend/API implementation**

# **3. Logic + processing layer**

# **4. UI integration**

# **5. UX polish**

# **6. Edge case handling**

# 

# **---**

# 

# **#### 3. Feature Complexity Control**

# **Avoid building large features in one step.**

# 

# **Instead:**

# **- split into small modules**

# **- implement incrementally**

# **- test each part independently**

# 

# **---**

# 

# **#### 4. Feature Examples (How they should be treated)**

# 

# **### Route Drawing System**

# **- backend: route engine + spatial queries**

# **- frontend: map drawing tools**

# **- UX: live suggestions + radius logic**

# 

# **### Travel Radius System**

# **- backend: graph-based routing model**

# **- preprocessing transport data**

# **- caching for performance**

# 

# **### Photo System**

# **- storage system first**

# **- moderation pipeline next**

# **- UI gallery last**

# 

# **---**

# 

# **### Goal:**

# **New features should feel native to the system, not bolted on.**

# 

# **---**

# 

# **## 5. Deployment / Expansion (FINAL PRIORITY)**

# **Only done when system is stable and feature-complete.**

# 

# **### Approach Rules:**

# **- deploy only stable builds**

# **- avoid deploying experimental features to production**

# **- ensure monitoring + rollback options exist**

# 

# **### Key Areas:**

# **- domain setup**

# **- hosting + scaling strategy**

# **- database optimisation**

# **- performance tuning**

# **- analytics (optional)**

# 

# **---**

# 

# **# GLOBAL DEVELOPMENT RULES**

# 

# **## Dependency Order Rule (VERY IMPORTANT)**

# **If a task depends on another system:**

# **- always complete dependencies first**

# **- never build UI on unstable backend**

# **- never scale broken logic**

# 

# **---**

# 

# **## Long-Term Efficiency Rule**

# **If a task can:**

# **- simplify future features**

# **- reduce duplication**

# **- improve system architecture**

# 

# **➡ prioritise it even if it takes longer initially**

# 

# **---**

# 

# **## System Thinking Requirement**

# **Always consider:**

# **- "Will this still work when the app is 10x bigger?"**

# **- "Does this reduce or increase complexity?"**

# **- "Can this be reused elsewhere?"**

# **-Always update TODO, using strikethrough for progress updates.**

# **-After large updates, update (or create) README and remind of push to git.**

# **-Thanks!!**

# 

# **---**

# 

# **# FINAL GOAL**

# **Build a scalable, clean, map-based travel platform where:**

# **- backend is structured and extensible**

# **- UI is minimal and responsive**

# **- features integrate naturally**

# **- system complexity stays controlled over time**

