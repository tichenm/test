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
    expect(screen.getByText("Store inventory control")).toBeInTheDocument();
    expect(screen.getByText("Project rollout and handoff")).toBeInTheDocument();
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
    const controlButton = screen.getByRole("button", {
      name: "Start store inventory control diagnosis",
    });
    const projectButton = screen.getByRole("button", {
      name: "Start project rollout and handoff diagnosis",
    });

    expect(inventoryButton).toHaveAttribute("name", "railKey");
    expect(inventoryButton).toHaveAttribute("value", "inventory-replenishment");
    expect(storeButton).toHaveAttribute("name", "railKey");
    expect(storeButton).toHaveAttribute("value", "store-stock-replenishment");
    expect(controlButton).toHaveAttribute("name", "railKey");
    expect(controlButton).toHaveAttribute("value", "store-inventory-control");
    expect(projectButton).toHaveAttribute("name", "railKey");
    expect(projectButton).toHaveAttribute("value", "project-rollout-handoff");
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
