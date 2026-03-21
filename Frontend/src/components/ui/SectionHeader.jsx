import { cx } from "../../utils/cx";

function SectionHeader({
  title,
  subtitle,
  right,
  className,
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

export default SectionHeader;
