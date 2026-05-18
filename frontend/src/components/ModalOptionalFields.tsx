import type { ReactNode } from "react";

interface ModalOptionalField {
  id: string;
  open: boolean;
  wide?: boolean;
  children: ReactNode;
}

interface ModalOptionalFieldsProps {
  items: ModalOptionalField[];
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ModalOptionalFields({ items }: ModalOptionalFieldsProps) {
  const openItems = items.filter((item) => item.open);
  if (openItems.length === 0) return null;

  return (
    <div className="modal-optional-fields">
      {openItems.map((item) => (
        <div key={item.id} className={cx("modal-optional-field", item.wide && "modal-optional-field--wide")}>
          {item.children}
        </div>
      ))}
    </div>
  );
}
