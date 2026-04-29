from __future__ import annotations

import time
from typing import Optional

from pymodbus.client import ModbusTcpClient


class BaseModbusClient:
    """Cliente Modbus TCP com reconexao automatica."""

    def __init__(
        self,
        nome: str,
        host: str,
        porta: int = 502,
        device_id: int = 1,
        timeout: float = 3.0,
        tentativas_reconexao: int = 3,
        intervalo_reconexao: float = 1.0,
    ) -> None:
        self.nome = nome
        self.host = host
        self.porta = porta
        self.device_id = device_id
        self.timeout = timeout
        self.tentativas_reconexao = tentativas_reconexao
        self.intervalo_reconexao = intervalo_reconexao
        self.cliente: Optional[ModbusTcpClient] = None

    def conectar(self) -> bool:
        """Abre uma conexao Modbus TCP."""
        self.desconectar()
        self.cliente = ModbusTcpClient(host=self.host, port=self.porta, timeout=self.timeout)
        return bool(self.cliente.connect())

    def desconectar(self) -> None:
        """Fecha a conexao atual, quando existir."""
        if self.cliente is not None:
            self.cliente.close()
            self.cliente = None

    def garantir_conexao(self) -> None:
        """Reconecta automaticamente antes de uma operacao Modbus."""
        if self.cliente is not None and self.cliente.connected:
            return

        for tentativa in range(1, self.tentativas_reconexao + 1):
            if self.conectar():
                return

            if tentativa < self.tentativas_reconexao:
                time.sleep(self.intervalo_reconexao)

        raise ConnectionError(f"Nao foi possivel conectar ao equipamento {self.nome} em {self.host}:{self.porta}.")

    def ler_holding_registers(self, endereco: int, quantidade: int) -> list[int]:
        """Le holding registers com reconexao automatica em caso de falha."""
        return self._ler_registros_modbus("read_holding_registers", endereco, quantidade)

    def ler_input_registers(self, endereco: int, quantidade: int) -> list[int]:
        """Le input registers com reconexao automatica em caso de falha."""
        return self._ler_registros_modbus("read_input_registers", endereco, quantidade)

    def _ler_registros_modbus(self, metodo: str, endereco: int, quantidade: int) -> list[int]:
        self.garantir_conexao()
        assert self.cliente is not None

        leitor = getattr(self.cliente, metodo)
        resposta = leitor(
            address=endereco,
            count=quantidade,
            slave=self.device_id,
        )

        if resposta.isError():
            self.desconectar()
            self.garantir_conexao()
            assert self.cliente is not None
            leitor = getattr(self.cliente, metodo)
            resposta = leitor(
                address=endereco,
                count=quantidade,
                slave=self.device_id,
            )

        if resposta.isError():
            raise RuntimeError(f"Erro ao ler registros de {self.nome}: {resposta}")

        return list(resposta.registers)
