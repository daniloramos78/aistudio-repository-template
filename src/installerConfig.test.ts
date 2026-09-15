import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("windows installer upgrade", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const script = readFileSync(new URL("../build/installer.nsh", import.meta.url), "utf8");

  it("keeps a stable identity so Setup replaces the previous install", () => {
    expect(pkg.build.appId).toBe("br.com.planilhatestesufv.app");
    expect(pkg.build.nsis.guid).toBe("f5b56adf-6223-5ecc-86f9-b504afc78eff");
    expect(pkg.build.nsis.oneClick).toBe(false);
    expect(pkg.build.nsis.allowToChangeInstallationDirectory).toBe(false);
    expect(pkg.build.nsis.deleteAppDataOnUninstall).toBe(false);
    expect(pkg.build.nsis.include).toBe("build/installer.nsh");
    expect(pkg.build.nsis.uninstallDisplayName).toBe("Planilha de Testes UFV");
  });

  it("reuses the already installed folder when the previous exe is present", () => {
    expect(script).toMatch(/customInit/);
    expect(script).toMatch(/INSTALL_REGISTRY_KEY/);
    expect(script).toMatch(/StrCpy \$INSTDIR \$0/);
    expect(script).toMatch(/KEEP_APP_DATA/);
  });
});
