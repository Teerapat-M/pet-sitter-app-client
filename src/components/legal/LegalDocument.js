import { Fragment } from "react";

function Inlines({ value }) {
  const parts = Array.isArray(value) ? value : [value];
  return parts.map((part, index) => {
    if (typeof part === "string") {
      return <Fragment key={index}>{part}</Fragment>;
    }
    if (part?.strong) {
      return <strong key={index}>{part.strong}</strong>;
    }
    if (part?.link) {
      return (
        <a key={index} href={part.href} className="text-primary hover:underline">
          {part.link}
        </a>
      );
    }
    return null;
  });
}

function Block({ block, inset = false }) {
  const spacing = inset ? "mt-2" : undefined;

  if (block.type === "p") {
    return (
      <p className={spacing}>
        <Inlines value={block.children} />
      </p>
    );
  }

  if (block.type === "ul") {
    return (
      <ul className={`${inset ? "mt-2 " : ""}list-disc space-y-1 pl-5`}>
        {block.items.map((item, index) => (
          <li key={index}>
            <Inlines value={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "section") {
    return (
      <section>
        <h2 className="text-h4 font-bold text-gray-900">{block.heading}</h2>
        {block.children.map((child, index) => (
          <Block key={index} block={child} inset />
        ))}
      </section>
    );
  }

  return null;
}

export default function LegalDocument({ doc }) {
  return doc.blocks.map((block, index) => <Block key={index} block={block} />);
}
