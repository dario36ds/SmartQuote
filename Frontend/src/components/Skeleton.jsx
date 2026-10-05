import "./Skeleton.css";

export default function Skeleton({ width, height = 16, className = "" }) {
  return <span className={`sq-skeleton ${className}`} style={{ width, height }} aria-hidden="true" />;
}
