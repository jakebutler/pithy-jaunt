## 1. Design Token System Setup
- [ ] 1.1 Update `tailwind.config.ts` with semantic color tokens (primary: Sky Blue, secondary: Chestnut, neutral: Charcoal, background: Platinum)
- [ ] 1.2 Define typographic scale in Tailwind config (H1-H4, body, small, caption with Inter font)
- [ ] 1.3 Establish 4px-based spacing scale in Tailwind config
- [ ] 1.4 Define border radius system (4px, 8px, 12px, 16px)
- [ ] 1.5 Create elevation/shadow system (sm, default, md, lg, xl)
- [ ] 1.6 Update `app/globals.css` with CSS custom properties for colors
- [ ] 1.7 Add base typography defaults to globals.css
- [ ] 1.8 Implement smooth scroll behavior
- [ ] 1.9 Add focus-visible styles with Sky Blue focus rings
- [ ] 1.10 Set up animation utilities with prefers-reduced-motion support

## 2. Base Component Library
- [ ] 2.1 Create `components/ui/button.tsx` with variants (primary, secondary, outline, ghost, danger) and sizes (sm, md, lg)
- [ ] 2.2 Create `components/ui/card.tsx` with variants (default, elevated, outlined) and sections (header, body, footer)
- [ ] 2.3 Create `components/ui/input.tsx` with types (text, textarea, select) and states (default, focus, error, disabled)
- [ ] 2.4 Create `components/ui/badge.tsx` with variants (default, success, warning, error, info) and sizes (sm, md)
- [ ] 2.5 Create `components/ui/alert.tsx` with variants (success, error, warning, info), icons, and dismissible option
- [ ] 2.6 Create `components/ui/loading.tsx` with spinner variants, skeleton components, and button loading states
- [ ] 2.7 Create `components/ui/empty-state.tsx` with icon, title, description, and optional CTA

## 3. Layout Components
- [ ] 3.1 Create `components/ui/navigation.tsx` with responsive header, mobile menu, logo, user menu dropdown, and active states
- [ ] 3.2 Create `components/ui/layout.tsx` wrapper component with navigation, consistent container widths, and padding
- [ ] 3.3 Create `components/ui/breadcrumb.tsx` for detail pages with clickable segments
- [ ] 3.4 Create `components/ui/page-header.tsx` with title, description, and actions

## 4. Update Existing Components
- [ ] 4.1 Update `components/auth/AuthButton.tsx` to use new Button component
- [ ] 4.2 Update `components/repos/RepoCard.tsx` to use new Card and Badge components
- [ ] 4.3 Update `components/repos/RepoConnectForm.tsx` to use new Input and Button components
- [ ] 4.4 Update `components/repos/GitIngestReport.tsx` to use new Card and Alert components
- [ ] 4.5 Update `components/repos/CodeRabbitReport.tsx` to use new Card and Badge components
- [ ] 4.6 Update `components/tasks/TaskCard.tsx` to use new Card and Badge components
- [ ] 4.7 Update `components/tasks/TaskCreateForm.tsx` to use new Input and Button components
- [ ] 4.8 Update `components/tasks/TaskActions.tsx` to use new Button and Alert components
- [ ] 4.9 Update `components/tasks/TaskLogs.tsx` to use new Card component (keep terminal styling)
- [ ] 4.10 Update `components/tasks/WorkspaceStatus.tsx` to use new Badge component

## 5. Page Redesigns
- [ ] 5.1 Redesign `app/page.tsx` landing page with modern hero, Sky Blue and Chestnut accents, and clear CTAs
- [ ] 5.2 Redesign `app/(auth)/login/page.tsx` with centered clean design, better form styling, improved hierarchy
- [ ] 5.3 Redesign `app/(auth)/signup/page.tsx` with consistent auth page styling
- [ ] 5.4 Redesign `app/(auth)/magic-link/page.tsx` with consistent auth page styling
- [ ] 5.5 Redesign `app/dashboard/page.tsx` with better stat cards, improved hierarchy, modern grid layout
- [ ] 5.6 Redesign `app/repos/page.tsx` with consistent card design, better empty states
- [ ] 5.7 Redesign `app/repos/[repoId]/page.tsx` with improved information hierarchy, better status indicators
- [ ] 5.8 Redesign `app/tasks/page.tsx` with consistent card design, better empty states
- [ ] 5.9 Redesign `app/tasks/[taskId]/page.tsx` with clear task flow, better action buttons, improved log display
- [ ] 5.10 Update `app/layout.tsx` to use shared Layout component

## 6. Interactions & Feedback
- [ ] 6.1 Add hover states to all interactive elements with smooth transitions
- [ ] 6.2 Implement loading states everywhere (button spinners, skeleton screens, progress indicators)
- [ ] 6.3 Add success/error feedback animations (toast notifications, inline feedback)
- [ ] 6.4 Implement page transition animations

## 7. Accessibility
- [ ] 7.1 Ensure all interactive elements have visible focus states (Sky Blue focus rings)
- [ ] 7.2 Add ARIA labels to buttons, form inputs, navigation, and status messages
- [ ] 7.3 Verify color contrast meets WCAG AA standards for all text/background combinations
- [ ] 7.4 Implement keyboard navigation for all interactive elements with logical tab order
- [ ] 7.5 Test with screen readers and fix any issues

## 8. Testing & Validation
- [ ] 8.1 Test all pages on mobile viewports (responsive design)
- [ ] 8.2 Test all pages on desktop viewports
- [ ] 8.3 Verify all components render correctly with new design system
- [ ] 8.4 Test all interactive elements (buttons, forms, navigation)
- [ ] 8.5 Verify color contrast with accessibility tools
- [ ] 8.6 Test keyboard navigation throughout application
- [ ] 8.7 Test with screen reader (VoiceOver/NVDA)
- [ ] 8.8 Verify animations respect prefers-reduced-motion
- [ ] 8.9 Test loading states and error handling
- [ ] 8.10 Verify brand colors are used consistently (Sky Blue, Chestnut, Charcoal, Platinum)

