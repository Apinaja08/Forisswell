import { cx } from "../../utils/cx";

function Card({ as: Component = "section", className, children, ...props }) {
  return (
    <Component className={cx("surface-card", className)} {...props}>
      {children}
    </Component>
  );
}

export default Card;
