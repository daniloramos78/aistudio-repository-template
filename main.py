from pymodbus.client import ModbusTcpClient


class SistemaScada:
    """Cliente simples para comunicação SCADA via Modbus TCP."""

    def __init__(self, host: str, porta: int = 502, timeout: float = 3.0) -> None:
        self.host = host
        self.porta = porta
        self.timeout = timeout
        self.cliente = ModbusTcpClient(host=self.host, port=self.porta, timeout=self.timeout)

    def conectar(self) -> bool:
        """Conecta ao servidor Modbus TCP configurado."""
        return self.cliente.connect()

    def desconectar(self) -> None:
        """Encerra a conexão com o servidor Modbus TCP."""
        self.cliente.close()

    def ler_registros(self, endereco: int, quantidade: int, device_id: int = 1) -> list[int]:
        """Le registros holding a partir de um endereco Modbus."""
        resposta = self.cliente.read_holding_registers(
            address=endereco,
            count=quantidade,
            slave=device_id,
        )

        if resposta.isError():
            raise RuntimeError(f"Erro ao ler registros Modbus: {resposta}")

        return resposta.registers


if __name__ == "__main__":
    scada = SistemaScada(host="127.0.0.1")

    if scada.conectar():
        try:
            print("Conectado ao servidor Modbus TCP.")
            print(scada.ler_registros(endereco=0, quantidade=2))
        finally:
            scada.desconectar()
    else:
        print("Nao foi possivel conectar ao servidor Modbus TCP.")
