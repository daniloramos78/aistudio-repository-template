from __future__ import annotations

from .base_client import BaseModbusClient


class HuksefluxHB500(BaseModbusClient):
    """Driver Modbus TCP para datalogger Hukseflux HB500."""

    CANAIS_ANALOGICOS = tuple(f"AI{indice}" for indice in range(8))

    def __init__(
        self,
        endereco_base_ai: int = 0,
        escala_mv: float = 1.0,
        registrador_assinado: bool = False,
        canais: dict[str, dict[str, float | int | str]] | None = None,
        **kwargs: object,
    ) -> None:
        super().__init__(**kwargs)
        self.endereco_base_ai = endereco_base_ai
        self.escala_mv = escala_mv
        self.registrador_assinado = registrador_assinado
        self.canais = canais or {}

    def ler_ai0(self) -> float:
        return self.ler_canal_analogico("AI0")

    def ler_ai1(self) -> float:
        return self.ler_canal_analogico("AI1")

    def ler_ai2(self) -> float:
        return self.ler_canal_analogico("AI2")

    def ler_ai3(self) -> float:
        return self.ler_canal_analogico("AI3")

    def ler_ai4(self) -> float:
        return self.ler_canal_analogico("AI4")

    def ler_ai5(self) -> float:
        return self.ler_canal_analogico("AI5")

    def ler_ai6(self) -> float:
        return self.ler_canal_analogico("AI6")

    def ler_ai7(self) -> float:
        return self.ler_canal_analogico("AI7")

    def ler_canais_analogicos(self) -> dict[str, float]:
        """Le todos os canais AI0 a AI7 em milivolts."""
        return {canal: self.ler_canal_analogico(canal) for canal in self.CANAIS_ANALOGICOS}

    def ler_canal_analogico(self, canal: str) -> float:
        """Le um canal AI usando Input Registers e retorna o valor em mV."""
        endereco = self._endereco_canal(canal)
        valor_bruto = self.ler_input_registers(endereco=endereco, quantidade=1)[0]
        return self.converter_registro_para_mv(
            valor_bruto,
            escala_mv=self.escala_mv,
            assinado=self.registrador_assinado,
        )

    def ler_sensores_convertidos(self) -> dict[str, float]:
        """Le canais configurados e converte mV para a unidade do sensor."""
        leituras: dict[str, float] = {}

        for canal in self.CANAIS_ANALOGICOS:
            valor_mv = self.ler_canal_analogico(canal)
            config = self.canais.get(canal, {})
            nome = str(config.get("nome", canal))
            tipo = str(config.get("tipo", "mv"))

            if tipo == "irradiancia":
                sensibilidade = float(config["sensibilidade_mv_por_wm2"])
                leituras[nome] = self.converter_mv_para_irradiancia(valor_mv, sensibilidade)
            elif tipo == "temperatura":
                ganho = float(config.get("ganho_c_por_mv", 1.0))
                offset = float(config.get("offset_c", 0.0))
                leituras[nome] = self.converter_mv_para_temperatura(valor_mv, ganho, offset)
            else:
                leituras[nome] = valor_mv

        return leituras

    def _endereco_canal(self, canal: str) -> int:
        self._validar_canal(canal)
        config = self.canais.get(canal, {})
        if "endereco" in config:
            return int(config["endereco"])

        return self.endereco_base_ai + int(canal[2:])

    @staticmethod
    def converter_registro_para_mv(
        valor_bruto: int,
        escala_mv: float = 1.0,
        assinado: bool = False,
    ) -> float:
        """Converte o valor inteiro do registrador para milivolts."""
        if assinado and valor_bruto >= 0x8000:
            valor_bruto -= 0x10000

        return float(valor_bruto) * escala_mv

    @staticmethod
    def converter_mv_para_irradiancia(valor_mv: float, sensibilidade_mv_por_wm2: float) -> float:
        """Converte mV para W/m2 usando a sensibilidade calibrada do piranometro."""
        if sensibilidade_mv_por_wm2 <= 0:
            raise ValueError("A sensibilidade deve ser maior que zero.")

        return valor_mv / sensibilidade_mv_por_wm2

    @staticmethod
    def converter_mv_para_temperatura(valor_mv: float, ganho_c_por_mv: float, offset_c: float = 0.0) -> float:
        """Converte mV para graus Celsius usando ganho e offset do sensor."""
        return (valor_mv * ganho_c_por_mv) + offset_c

    def _validar_canal(self, canal: str) -> None:
        if canal not in self.CANAIS_ANALOGICOS:
            raise ValueError(f"Canal analogico invalido: {canal}. Use AI0 a AI7.")
