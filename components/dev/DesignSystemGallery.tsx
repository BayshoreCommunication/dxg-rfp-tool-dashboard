"use client";

import { ArrowRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button, { type ButtonVariant } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import InlineAlert from "@/components/ui/InlineAlert";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import Textarea from "@/components/ui/Textarea";

// Development reference page: every primitive in every state, in whichever theme the app is in
// (use the local dark-preview toggle to switch). Forced states are applied with classes so they
// can be seen and captured without hovering; tab through the page to see real focus rings.

const TEXT_TOKENS = ["heading", "body", "muted"] as const;
const SURFACE_TOKENS = ["page", "surface", "surface-muted", "brand-soft"] as const;
const STATUS = ["success", "warning", "danger"] as const;
const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];
const BADGES: BadgeTone[] = ["gray", "blue", "amber", "purple", "green", "muted", "success", "warning", "danger", "info"];

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div>
        <h2 id={id} className="text-xl font-extrabold text-heading">{title}</h2>
        {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{children}</p>
);

const Swatch = ({ token }: { token: string }) => (
  <div className="min-w-0">
    <div className="h-12 rounded-control border border-line" style={{ background: `var(--${token})` }} aria-hidden />
    <p className="mt-1 truncate text-xs text-body">--{token}</p>
  </div>
);

export default function DesignSystemGallery() {
  return (
    <div data-testid="design-system-gallery" className="mx-auto max-w-5xl space-y-12 bg-page px-4 py-8 text-body sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold text-heading">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6">
          Semantic tokens and primitives from <code>app/styles/tokens.css</code> and <code>components/ui</code>.
          Development only: this page returns 404 in production. Switch themes with the local dark-preview toggle.
        </p>
      </header>

      <Section id="ds-colour" title="Colour tokens" note="Raw token values. Contrast for every text and control pair is enforced by lib/designTokens.test.ts in both themes.">
        <Card>
          <Label>Surfaces and lines</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {[...SURFACE_TOKENS, "line", "line-strong", "control", "subtle"].map((t) => <Swatch key={t} token={t} />)}
          </div>
          <div className="mt-6"><Label>Text</Label></div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {TEXT_TOKENS.map((t) => <p key={t} className="text-base font-semibold" style={{ color: `var(--${t})` }}>--{t}: The quick brown fox</p>)}
            <p className="text-sm text-muted">--subtle is for decorative or disabled content only, so it is shown as a swatch above and never as readable text.</p>
          </div>
          <div className="mt-6"><Label>Brand and action</Label></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {["brand", "action", "action-hover", "brand-soft", "focus"].map((t) => <Swatch key={t} token={t} />)}
          </div>
          <div className="mt-6"><Label>Status (fill, strong text, soft surface)</Label></div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9">
            {STATUS.flatMap((s) => [s, `${s}-strong`, `${s}-soft`]).map((t) => <Swatch key={t} token={t} />)}
          </div>
        </Card>
      </Section>

      <Section id="ds-type" title="Typography" note="Proxima Nova ships 400, 600 and 800 only: use font-normal, font-semibold and font-extrabold.">
        <Card className="space-y-2">
          <p className="text-3xl font-extrabold text-heading">Page title, 30 px extrabold</p>
          <p className="text-2xl font-extrabold text-heading">Section title, 24 px extrabold</p>
          <p className="text-xl font-semibold text-heading">Card title, 20 px semibold</p>
          <p className="text-base">Body copy, 16 px regular, <span className="font-semibold">with emphasis</span>.</p>
          <p className="text-sm">Secondary copy, 14 px. <a href="#ds-type" className="font-semibold text-action underline underline-offset-2 hover:text-action-hover">An action-coloured link</a></p>
          <p className="text-xs text-muted">Caption, 12 px minimum, muted token.</p>
        </Card>
      </Section>

      <Section id="ds-buttons" title="Buttons" note="Variants by size, with default, icon, focus (forced), disabled and loading states. Hover and real focus can be tried live.">
        <Card className="space-y-6">
          {VARIANTS.map((variant) => (
            <div key={variant}>
              <Label>{variant}</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant={variant} size="sm">Small</Button>
                <Button variant={variant}>Medium</Button>
                <Button variant={variant} size="lg">Large</Button>
                <Button variant={variant} leadingIcon={<Plus className="h-4 w-4" aria-hidden />}>Leading icon</Button>
                <Button variant={variant} trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden />}>Trailing icon</Button>
                <Button variant={variant} className="ring-2 ring-focus ring-offset-2 ring-offset-surface" data-state="focus">Focus</Button>
                <Button variant={variant} disabled>Disabled</Button>
                <Button variant={variant} loading>Loading</Button>
              </div>
            </div>
          ))}
        </Card>
      </Section>

      <Section id="ds-fields" title="Fields" note="Field owns label, hint and error ids. Required and Optional are visible text, and errors are announced.">
        <Card className="grid gap-6 md:grid-cols-2">
          <Field label="Default">{(a) => <Input {...a} placeholder="Placeholder text" />}</Field>
          <Field label="Required with hint" required hint="Shown to vendors on the proposal.">{(a) => <Input {...a} defaultValue="Northstar Leadership Summit" />}</Field>
          <Field label="Optional" optional>{(a) => <Input {...a} />}</Field>
          <Field label="Error" required error="Enter an event name.">{(a) => <Input {...a} />}</Field>
          <Field label="Disabled">{(a) => <Input {...a} disabled defaultValue="Cannot be edited" />}</Field>
          <Field label="Focus (forced)">{(a) => <Input {...a} className="border-focus ring-2 ring-focus" defaultValue="Focused look" />}</Field>
          <Field label="Textarea with count" hint="Up to 200 characters." className="md:col-span-1">
            {(a) => <Textarea {...a} maxLength={200} showCount defaultValue="Describe the event in a few sentences." />}
          </Field>
          <Field label="Textarea error" error="Add a short description." className="md:col-span-1">{(a) => <Textarea {...a} />}</Field>
        </Card>
      </Section>

      <Section id="ds-cards" title="Cards">
        <div className="grid gap-4 md:grid-cols-3">
          <Card as="article">
            <Card.Header><h3 className="text-base font-semibold text-heading">Default card</h3><Badge tone="success">Ready</Badge></Card.Header>
            <Card.Body>Header, body and footer parts on the surface token.</Card.Body>
            <Card.Footer><Button variant="secondary" size="sm">Cancel</Button><Button size="sm">Save</Button></Card.Footer>
          </Card>
          <Card tone="muted"><h3 className="text-base font-semibold text-heading">Muted card</h3><p className="mt-1 text-sm">Sunken area on the muted surface.</p></Card>
          <Card tone="brand"><h3 className="text-base font-semibold text-heading">Brand card</h3><p className="mt-1 text-sm">Soft brand tint for guidance.</p></Card>
        </div>
      </Section>

      <Section id="ds-alerts" title="Inline alerts" note="Icon, title and colour together. Danger uses role=alert; the others use role=status.">
        <div className="space-y-3">
          <InlineAlert tone="info" title="Heads up">Autosave is on for drafts.</InlineAlert>
          <InlineAlert tone="success" title="Saved">All changes saved.</InlineAlert>
          <InlineAlert tone="warning" title="Check before publishing">Two required items remain.</InlineAlert>
          <InlineAlert tone="danger" title="Save failed" action={<Button variant="danger" size="sm">Retry</Button>}>Your latest changes are not saved yet.</InlineAlert>
          <InlineAlert tone="info">Title-less alert with body text only.</InlineAlert>
        </div>
      </Section>

      <Section id="ds-badges" title="Badges" note="The first six keep their original classes; the last four use the token layer.">
        <Card className="flex flex-wrap gap-2">{BADGES.map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}</Card>
      </Section>

      <Section id="ds-skeleton" title="Skeleton" note="Hidden from assistive tech; pulse stops under reduced motion.">
        <Card className="space-y-4"><Skeleton className="h-6 w-1/3" /><Skeleton lines={3} /></Card>
      </Section>
    </div>
  );
}
