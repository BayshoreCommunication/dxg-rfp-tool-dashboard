import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export type CardTone = "default" | "muted" | "brand";
export type CardPadding = "none" | "sm" | "md" | "lg";

const TONES: Record<CardTone, string> = {
  default: "bg-surface border-line shadow-card",
  muted: "bg-surface-muted border-line",
  brand: "bg-brand-soft border-line",
};
const PADDING: Record<CardPadding, string> = { none: "", sm: "p-3", md: "p-5", lg: "p-6" };

export type CardProps = ComponentPropsWithRef<"div"> & {
  as?: "div" | "section" | "article";
  tone?: CardTone;
  padding?: CardPadding;
};

function CardRoot({ as: Tag = "div", tone = "default", padding = "md", className, ...rest }: CardProps) {
  return <Tag data-tone={tone} className={cn("rounded-card border text-body", TONES[tone], PADDING[padding], className)} {...rest} />;
}

function CardHeader({ className, ...rest }: ComponentPropsWithRef<"div">) {
  return <div className={cn("flex items-start justify-between gap-3 border-b border-line pb-4", className)} {...rest} />;
}
function CardBody({ className, ...rest }: ComponentPropsWithRef<"div">) {
  return <div className={cn("py-4", className)} {...rest} />;
}
function CardFooter({ className, ...rest }: ComponentPropsWithRef<"div">) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4", className)} {...rest} />;
}

const Card = Object.assign(CardRoot, { Header: CardHeader, Body: CardBody, Footer: CardFooter });
export default Card;
