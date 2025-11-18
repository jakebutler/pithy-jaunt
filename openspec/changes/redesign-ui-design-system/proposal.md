# Change: Redesign UI with Modern Design System

## Why

Pithy Jaunt's current UI was built quickly with placeholder design components, resulting in an inconsistent, dated interface that lacks visual cohesion and brand identity. The application feels like a collection of individual pages rather than a unified product. Users experience:
- Inconsistent interaction patterns across pages
- No clear visual hierarchy
- Hardcoded colors that don't reflect the brand palette
- Duplicated component logic
- Poor mobile experience
- Limited accessibility features

A comprehensive design overhaul will create a modern, cohesive user experience that reflects the brand identity, improves usability, and establishes a maintainable component system.

## What Changes

- **Design Token System**: Create semantic color tokens from brand palette (Chestnut #932F29, Sky Blue #73C5F3, Charcoal #565555, Platinum #EBEBEB), typographic scale, spacing system, and elevation system
- **Base Component Library**: Create shared components (Button, Card, Input, Badge, Alert, Loading, EmptyState) with consistent styling and behavior
- **Layout System**: Create shared Navigation, Layout, Breadcrumb, and PageHeader components to eliminate duplication
- **Global Styles**: Update `globals.css` with design tokens, smooth scroll, focus states, and animation utilities
- **Page Redesigns**: Redesign all pages (landing, auth, dashboard, repos, tasks) with modern aesthetic and improved hierarchy
- **Interactions**: Add hover states, loading states, success/error feedback, and page transitions
- **Accessibility**: Ensure WCAG 2.1 AA compliance with focus states, ARIA labels, keyboard navigation, and color contrast
- **Aceternity UI Integration**: Use Aceternity UI components as inspiration and foundation, customized with our brand palette

**BREAKING**: All existing component styles will change. No API or data model changes.

## Impact

- **Affected specs**: `frontend` (new capability)
- **Affected code**:
  - `/app/globals.css` - Design tokens and global styles
  - `/tailwind.config.ts` - Color tokens, typography, spacing configuration
  - `/components/ui/` - New base component library (Button, Card, Input, Badge, Alert, Loading, EmptyState, Navigation, Layout, Breadcrumb, PageHeader, EmptyState)
  - `/components/auth/` - Update to use new design system
  - `/components/repos/` - Update to use new design system
  - `/components/tasks/` - Update to use new design system
  - `/app/page.tsx` - Landing page redesign
  - `/app/(auth)/` - Auth pages redesign (login, signup, magic-link)
  - `/app/dashboard/page.tsx` - Dashboard redesign
  - `/app/repos/` - Repository pages redesign
  - `/app/tasks/` - Task pages redesign
  - `/app/layout.tsx` - Add shared layout structure

