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

    expect(screen.getByText("库存与补货")).toBeInTheDocument();
    expect(screen.getByText("门店库存与补货")).toBeInTheDocument();
    expect(screen.getByText("门店库存管控")).toBeInTheDocument();
    expect(screen.getByText("门店排班与人手配置")).toBeInTheDocument();
    expect(screen.getByText("门店设备故障与维修响应")).toBeInTheDocument();
    expect(screen.getByText("门店服务体验与客诉")).toBeInTheDocument();
    expect(screen.getByText("项目落地与交接")).toBeInTheDocument();
    expect(screen.getByText("仓库收货")).toBeInTheDocument();
    expect(screen.getByLabelText("门店或站点")).toBeInTheDocument();
    expect(screen.getByLabelText("角色或职能")).toBeInTheDocument();

    const inventoryButton = screen.getByRole("button", {
      name: "开始库存与补货诊断",
    });
    const warehouseButton = screen.getByRole("button", {
      name: "开始仓库收货诊断",
    });
    const storeButton = screen.getByRole("button", {
      name: "开始门店库存与补货诊断",
    });
    const controlButton = screen.getByRole("button", {
      name: "开始门店库存管控诊断",
    });
    const staffingButton = screen.getByRole("button", {
      name: "开始门店排班与人手配置诊断",
    });
    const equipmentButton = screen.getByRole("button", {
      name: "开始门店设备故障与维修响应诊断",
    });
    const serviceButton = screen.getByRole("button", {
      name: "开始门店服务体验与客诉诊断",
    });
    const projectButton = screen.getByRole("button", {
      name: "开始项目落地与交接诊断",
    });

    expect(inventoryButton).toHaveAttribute("name", "railKey");
    expect(inventoryButton).toHaveAttribute("value", "inventory-replenishment");
    expect(storeButton).toHaveAttribute("name", "railKey");
    expect(storeButton).toHaveAttribute("value", "store-stock-replenishment");
    expect(controlButton).toHaveAttribute("name", "railKey");
    expect(controlButton).toHaveAttribute("value", "store-inventory-control");
    expect(staffingButton).toHaveAttribute("name", "railKey");
    expect(staffingButton).toHaveAttribute("value", "store-staffing-scheduling");
    expect(equipmentButton).toHaveAttribute("name", "railKey");
    expect(equipmentButton).toHaveAttribute("value", "store-equipment-maintenance");
    expect(serviceButton).toHaveAttribute("name", "railKey");
    expect(serviceButton).toHaveAttribute("value", "store-service-complaints");
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

    expect(screen.getByText("推荐")).toBeInTheDocument();
  });
});
