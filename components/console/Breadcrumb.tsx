"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export function Breadcrumb() {
  const pathname = usePathname();
  
  if (!pathname || pathname === "/admin") {
    return null;
  }

  const paths = pathname.split("/").filter((p) => p !== "");
  
  return (
    <div className="flex items-center text-sm text-gray-500 mb-6 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
      <Link href="/admin" className="hover:text-blue-600 transition-colors flex items-center gap-1">
        <Home className="w-4 h-4" />
      </Link>
      
      {paths.map((path, index) => {
        if (path === "admin") return null;
        
        const href = `/${paths.slice(0, index + 1).join("/")}`;
        const isLast = index === paths.length - 1;
        const formattedPath = path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ");

        return (
          <React.Fragment key={path}>
            <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
            {isLast ? (
              <span className="text-gray-900 font-medium">{formattedPath}</span>
            ) : (
              <Link href={href} className="hover:text-blue-600 transition-colors">
                {formattedPath}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
