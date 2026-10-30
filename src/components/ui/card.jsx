import { cardClassName } from "@/lib/card";

function Card({ as: Comp = "div", interactive = false, className, ...props }) {
  return (
    <Comp
      data-slot="card"
      className={cardClassName({ interactive, className })}
      {...props}
    />
  );
}

export { Card, cardClassName };
