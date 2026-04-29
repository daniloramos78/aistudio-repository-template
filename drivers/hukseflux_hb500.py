from __future__ import annotations

import struct

from .base_client import BaseModbusClient


class HuksefluxHB500(BaseModbusClient):
    """Driver Modbus TCP para datalogger Hukseflux HB500."""

    REGISTRADORES_FLOAT = {
        "irradiancia_ghi_wm2": 1,
        "temperatura_ar_c": 3,
        "irradiancia_poa_wm2": 5,
        "temperatura_painel_c": 7,
    }

    def ler_irradiancia_ghi(self) -> float:
        return self._ler_float_holding_register("irradiancia_ghi_wm2")

    def ler_temperatura_ar(self) -> float:
        return self._ler_float_holding_register("temperatura_ar_c")

    def ler_irradiancia_poa(self) -> float:
        return self._ler_float_holding_register("irradiancia_poa_wm2")

    def ler_temperatura_painel(self) -> float:
        return self._ler_float_holding_register("temperatura_painel_c")

    def get_all_data(self) -> dict[str, float]:
        """Retorna todas as leituras do HB500 ja convertidas para unidades finais."""
        return {
            "irradiancia_ghi_wm2": self.ler_irradiancia_ghi(),
            "temperatura_ar_c": self.ler_temperatura_ar(),
            "irradiancia_poa_wm2": self.ler_irradiancia_poa(),
            "temperatura_painel_c": self.ler_temperatura_painel(),
        }

    def _ler_float_holding_register(self, nome: str) -> float:
        endereco = self.REGISTRADORES_FLOAT[nome]
        registradores = self.ler_holding_registers(endereco=endereco, quantidade=2)
        return self._converter_registradores_para_float(registradores)

    @staticmethod
    def _converter_registradores_para_float(registradores: list[int]) -> float:
        if len(registradores) != 2:
            raise ValueError("Leitura float do HB500 exige exatamente 2 registradores.")

        payload = struct.pack(">HH", registradores[0], registradores[1])
        return struct.unpack(">f", payload)[0]
