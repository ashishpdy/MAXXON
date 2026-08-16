import { SPEC_KEY_SETS } from "../catalog/registry.js";

function specLabel(key, t) {
  const translated = t(`spec.${key}`);
  if (translated !== `spec.${key}`) return translated;
  return key.replace(/[_-]+/g, " ");
}

export default function SpecTable({ specs, specKeys, t, productName, showAll = false }) {
  const preferred = specKeys?.length ? specKeys : SPEC_KEY_SETS.default;
  const extra = showAll
    ? Object.keys(specs || {}).filter((key) => specs[key] && !preferred.includes(key))
    : [];
  const keys = [...preferred, ...extra];
  const rows = keys
    .map((key) => ({ key, label: specLabel(key, t), value: specs?.[key] }))
    .filter((row) => row.value);

  if (!rows.length) {
    return <p className="card-specs-empty">{t("card.specsEmpty")}</p>;
  }

  return (
    <table className="card-specs">
      <caption className="visually-hidden">{t("a11y.specs", { name: productName })}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
