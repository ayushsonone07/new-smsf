import * as React from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@hrm/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

interface ParsedOption {
  value: string;
  label: string;
  disabled: boolean;
}

function childrenToLabel(children: React.ReactNode): string {
  const parts: string[] = [];
  React.Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") parts.push(String(child));
  });
  return parts.join("");
}

function parseOptions(children: React.ReactNode): ParsedOption[] {
  const options: ParsedOption[] = [];
  function collect(node: React.ReactNode) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === React.Fragment) {
        collect((child.props as { children?: React.ReactNode }).children);
      } else if (child.type === "option") {
        const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
        const childLabel = childrenToLabel(props.children);
        const value = props.value != null ? String(props.value) : childLabel;
        const label = childLabel || value;
        options.push({ value, label, disabled: Boolean(props.disabled) });
      }
    });
  }
  collect(children);
  return options;
}

function emitChange(
  onChange: React.ChangeEventHandler<HTMLSelectElement> | undefined,
  value: string,
  name?: string,
) {
  if (!onChange) return;
  onChange({
    target: { value, name: name ?? "" },
    currentTarget: { value, name: name ?? "" },
  } as React.ChangeEvent<HTMLSelectElement>);
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled,
      id,
      name,
      required,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const options = parseOptions(children);
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(() =>
      defaultValue != null ? String(defaultValue) : String(options[0]?.value ?? ""),
    );
    const selectedValue = isControlled ? String(value ?? "") : uncontrolledValue;
    const selected = options.find((option) => option.value === selectedValue) ?? options[0];

    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ left: 0, top: 0, width: 0, opensAbove: false });
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    useEffect(() => {
      if (!open) return;

      function closeOnOutsidePointer(event: MouseEvent) {
        const target = event.target as Node;
        if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
          setOpen(false);
        }
      }

      function closeOnEscape(event: KeyboardEvent) {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }

      document.addEventListener("mousedown", closeOnOutsidePointer);
      document.addEventListener("keydown", closeOnEscape, true);
      return () => {
        document.removeEventListener("mousedown", closeOnOutsidePointer);
        document.removeEventListener("keydown", closeOnEscape, true);
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;

      function updatePosition() {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const menuHeight = Math.min(288, options.length * 42 + 16);
        const spaceBelow = window.innerHeight - rect.bottom;
        const opensAbove = spaceBelow < menuHeight && rect.top > spaceBelow;
        const width = Math.max(rect.width, 160);
        setMenuPos({
          left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
          top: opensAbove ? rect.top - 4 : rect.bottom + 4,
          width,
          opensAbove,
        });
      }

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [open, options.length]);

    function commit(nextValue: string) {
      if (!isControlled) setUncontrolledValue(nextValue);
      emitChange(onChange, nextValue, name);
      setOpen(false);
      triggerRef.current?.focus();
    }

    return (
      <div ref={rootRef} className={cn("relative min-w-0", open && "z-[70]")}>
        <select
          ref={ref}
          id={id ? `${id}-native` : undefined}
          name={name}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          value={selectedValue}
          onChange={() => undefined}
          onInvalid={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute h-px w-px opacity-0"
        >
          {children}
        </select>

        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onBlur={onBlur as unknown as React.FocusEventHandler<HTMLButtonElement>}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "relative flex h-10 w-full cursor-pointer appearance-none items-center gap-2 rounded-xl border border-input bg-surface-elevated py-2 pl-3 pr-3 text-left text-sm font-medium text-foreground shadow ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            open && "border-input text-foreground",
            className,
          )}
          {...props as any}
        >
          <span className="min-w-0 flex-1 truncate text-foreground">{selected?.label ?? "Select"}</span>
          <ChevronDown
            className={cn(
              "pointer-events-none h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {open
          ? createPortal(
              <div
                ref={menuRef}
                id={listId}
                role="listbox"
                aria-label={ariaLabel}
                style={{
                  left: menuPos.left,
                  top: menuPos.top,
                  width: menuPos.width,
                  transform: menuPos.opensAbove ? "translateY(-100%)" : undefined,
                }}
                className="fixed z-[90] max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
              >
                {options.map((option) => {
                  const isSelected = option.value === selectedValue;
                  return (
                    <button
                      key={option.value || option.label}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => commit(option.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl bg-transparent px-3 py-2.5 text-left text-sm transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50",
                        isSelected ? "font-semibold text-primary" : "text-foreground",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
