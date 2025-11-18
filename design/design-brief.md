# Pithy Jaunt Design Overhaul Brief
## Summary 
Pithy Jaunt was built quickly with some placeholder design components. We need to do a complete overhaul of our front end design and UX. 

## General Guidelines
We want a clean, modern UI that leverages animations and transitions where appropriate, is mobile-first, and simple to use.

## Workflow
Follow these steps precisely. Stop and ask the user clarifying questions at the end of each step and get their approval before moving on to the next step.
1. Analyze /app and /components and identify what feels dated or inconsistent. Categorize them into: Layout issues, spacing issues, color problems, typography problems, and component inconsistencies. Do NOT make changes yet.
2. From the perspective of a senior UX and UI designer, write up a critique summary with directions on ways to improve. Create a full page and component list to make the next steps easier.
3. Use Aceternity UI as the basis for the new front end design and components. Find analogous components in Aceternity and assess their viability. Based on your analysis and the palette in /design/color-palette.md, propose a unified modern aesthetic and list each global UI change as a numbered item. Include reasoning.
4. From the perspective of a front end developer, run through the OpenSpec workflow to come up with proposal for implementation.

## Specific implementation guidelines
Convert all components to use semantic color tokens.
Apply changes incrementally, one file at a time.
Start with the smallest atoms.
Follow the style guidelines in /design.
Use the semantic color tokens derived from palette.md
Prefer minimal, modern, accessible patterns.
Avoid inline styles.
Identify inconsistencies and improve them proactively.
Ask clarifying questions before making large changes.