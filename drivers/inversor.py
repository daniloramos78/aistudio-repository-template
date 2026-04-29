from __future__ import annotations

from .base_client import BaseModbusClient


class Inversor(BaseModbusClient):
    """Cliente Modbus TCP especifico para inversores."""

    def __init__(self, registradores: dict[str, dict[str, int]], **kwargs: object) -> None:
        super().__init__(**kwargs)
        self.registradores = registradores

    def ler_medicoes(self) -> dict[str, int]:
        leituras: dict[str, int] = {}

        for nome, registro in self.registradores.items():
            valores = self.ler_holding_registers(
                endereco=registro["endereco"],
                quantidade=registro.get("quantidade", 1),
            )
            if len(valores) == 1:
                leituras[nome] = valores[0]
                continue

            for indice, valor in enumerate(valores):
                leituras[f"{nome}_{indice}"] = valor

        return leituras
