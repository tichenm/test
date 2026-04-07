import { render, screen } from "@testing-library/react";

import { RailPicker } from "@/components/rail-picker";
import { listDiagnosticRails } from "@/lib/diagnostic-engine";

describe("RailPicker", () => {
  it("renders all available rails with distinct submit values", () => {
    render(
      <RailPicker
        rails={listDiagnosticRails()}
        defaultRailKey="inventory-replenishment"
        action="#"
      />,
    );

    expect(screen.getByText("Inventory and replenishment")).toBeInTheDocument();
    expect(screen.getByText("Store stock and replenishment")).toBeInTheDocument();
    expect(screen.getByText("Warehouse receiving")).toBeInTheDocument();
    expect(screen.getByLabelText("Store or site")).toBeInTheDocument();
    expect(screen.getByLabelText("Role or function")).toBeInTheDocument();

    const inventoryButton = screen.getByRole("button", {
      name: "Start inventory and replenishment diagnosis",
    });
    const warehouseButton = screen.getByRole("button", {
      name: "Start warehouse receiving diagnosis",
    });
    const storeButton = screen.getByRole("button", {
      name: "Start store stock and replenishment diagnosis",
    });

    expect(inventoryButton).toHaveAttribute("name", "railKey");
    expect(inventoryButton).toHaveAttribute("value", "inventory-replenishment");
    expect(storeButton).toHaveAttribute("name", "railKey");
    expect(storeButton).toHaveAttribute("value", "store-stock-replenishment");
    expect(warehouseButton).toHaveAttribute("name", "railKey");
    expect(warehouseButton).toHaveAttribute("value", "warehouse-receiving");
  });

  it("marks the default rail as recommended", () => {
    render(
      <RailPicker
        rails={listDiagnosticRails()}
        defaultRailKey="inventory-replenishment"
        action="#"
      />,
    );

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });
});
