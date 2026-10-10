import stock from "@/data/verified-stock.json";
import { Copilot } from "@/components/copilot";

export default function Home() {
  return (
    <main>
      <header className="page-header">
        <p className="eyebrow">SALESEASY / ASSESSMENT DEMO</p>
        <h1>
          Turn field reports into
          <br />
          clear next steps.
        </h1>
        <p className="intro">
          Compare reported claims with inventory evidence. See what needs
          attention and when to involve a person.
        </p>
      </header>
      <Copilot />
      <section className="panel stock-panel" aria-labelledby="stock-heading">
        <div className="stock-header">
          <h2 id="stock-heading">Reference inventory</h2>
          <span className="small-label">Fictional assessment data</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Outlet</th>
                <th scope="col">SKU</th>
                <th scope="col">System stock</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((item) => (
                <tr key={item.outlet}>
                  <td>{item.outlet}</td>
                  <td>{item.sku}</td>
                  <td className="number">{item.system_stock} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted inventory-note">
          System stock is a supplied record. Current shelf stock and reported
          sales impact still need confirmation.
        </p>
      </section>
      <footer>
        Recommendations are advisory. This demo does not change prices, place
        orders or notify a reviewer.
      </footer>
    </main>
  );
}
