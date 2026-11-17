"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./AppContext";

interface TransitionLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export function TransitionLink({
  href,
  onClick,
  onPointerEnter,
  onFocus,
  children,
  ...rest
}: TransitionLinkProps) {
  const { navigateTo, isTransitioning } = useApp();
  const router = useRouter();

  const handlePrefetch = () => {
    if (
      href &&
      !href.startsWith("http") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:")
    ) {
      router.prefetch(href);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0 ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      onClick?.(e);
      return;
    }

    e.preventDefault();
    if (isTransitioning) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX || rect.left + rect.width / 2;
    const cy = e.clientY || rect.top + rect.height / 2;
    const origin = {
      x: cx / Math.max(window.innerWidth, 1),
      y: 1 - cy / Math.max(window.innerHeight, 1),
    };
    handlePrefetch();
    onClick?.(e);
    navigateTo(href, origin);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      onPointerEnter={(e) => {
        handlePrefetch();
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        handlePrefetch();
        onFocus?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
