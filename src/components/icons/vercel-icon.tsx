import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function VercelIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn(props.className)}
            {...props}
        >
            <path d="M12 2L2 22h20L12 2z" />
        </svg>
    );
}
