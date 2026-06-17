// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

interface ButtonProps {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}
export function Button(props: ButtonProps) {
    return <button className={props.className} disabled={props.disabled}>{props.label}</button>;
}
export function Icon({ name }: { name: string }) {
    return <i className={"icon-" + name}></i>;
}
