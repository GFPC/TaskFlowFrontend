"use client";

import { SelectItem } from "@/components/ui/select";
import { PROJECT_ROLE_OPTIONS, projectRoleLabel } from "@/lib/roles";

export function ProjectRoleSelectItems() {
  return (
    <>
      {PROJECT_ROLE_OPTIONS.map((role) => (
        <SelectItem key={role} value={role}>
          {projectRoleLabel(role)}
        </SelectItem>
      ))}
    </>
  );
}
