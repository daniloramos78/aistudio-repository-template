from __future__ import annotations

import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

import yaml

from database.logger import DataLogger
from drivers.estacao_solar import EstacaoSolar
from drivers.hukseflux_hb500 import HuksefluxHB500
from drivers.inversor import Inversor
from services.mqtt_sender import MqttSender


class SistemaScada:
    """Coordena configuracao, leitura Modbus e persistencia dos dados."""

    def __init__(self, config_path: str = "config.yaml") -> None:
        self.config = self._carregar_config(config_path)
        self.logger = self._criar_logger(self.config["logging"])
        self.inversores = self._criar_inversores(self.config["equipamentos"])
        self.estacoes_solares = self._criar_estacoes_solares(self.config["equipamentos"])
        self.hukseflux_hb500 = self._criar_hukseflux_hb500(self.config["equipamentos"])
        self.mqtt_sender = self._criar_mqtt_sender(self.config.get("mqtt"))

    def executar_ciclo(self) -> None:
        """Executa uma rodada de leitura para todos os inversores configurados."""
        for inversor in self.inversores:
            self._coletar_e_salvar(inversor.nome, inversor.ler_medicoes)

        for estacao in self.estacoes_solares:
            self._coletar_e_salvar(
                estacao.nome,
                estacao.ler_dados,
                publicar_mqtt=True,
            )

        for datalogger in self.hukseflux_hb500:
            self._coletar_e_salvar(datalogger.nome, datalogger.ler_sensores_convertidos)

    def executar(self) -> None:
        """Roda o loop principal do SCADA."""
        intervalo = self.config["logging"].get("intervalo_segundos", 5)

        try:
            while True:
                self.executar_ciclo()
                time.sleep(intervalo)
        except KeyboardInterrupt:
            print("SistemaScada finalizado pelo usuario.")
        finally:
            for equipamento in [*self.inversores, *self.estacoes_solares, *self.hukseflux_hb500]:
                equipamento.desconectar()
            if self.mqtt_sender is not None:
                self.mqtt_sender.desconectar()

    @staticmethod
    def _carregar_config(config_path: str) -> dict[str, Any]:
        caminho = Path(config_path)
        with caminho.open("r", encoding="utf-8") as arquivo:
            return yaml.safe_load(arquivo)

    @staticmethod
    def _criar_logger(config: dict[str, Any]) -> DataLogger:
        tipo = config.get("tipo", "sqlite")
        caminho = config["sqlite_path"] if tipo == "sqlite" else config["csv_path"]
        return DataLogger(tipo=tipo, caminho=caminho)

    @staticmethod
    def _criar_inversores(equipamentos: dict[str, dict[str, Any]]) -> list[Inversor]:
        inversores: list[Inversor] = []

        for nome, equipamento in equipamentos.items():
            if equipamento.get("tipo") != "inversor":
                continue

            inversores.append(
                Inversor(
                    nome=nome,
                    host=equipamento["host"],
                    porta=equipamento.get("porta", 502),
                    timeout=equipamento.get("timeout", 3.0),
                    device_id=equipamento.get("device_id", 1),
                    registradores=equipamento["registradores"],
                )
            )

        return inversores

    @staticmethod
    def _criar_estacoes_solares(equipamentos: dict[str, dict[str, Any]]) -> list[EstacaoSolar]:
        estacoes: list[EstacaoSolar] = []

        for nome, equipamento in equipamentos.items():
            if equipamento.get("tipo") != "estacao_solar":
                continue

            estacoes.append(
                EstacaoSolar(
                    nome=nome,
                    host=equipamento["host"],
                    porta=equipamento.get("porta", 502),
                    timeout=equipamento.get("timeout", 3.0),
                    device_id=equipamento.get("device_id", 1),
                    registradores=equipamento["registradores"],
                )
            )

        return estacoes

    @staticmethod
    def _criar_hukseflux_hb500(equipamentos: dict[str, dict[str, Any]]) -> list[HuksefluxHB500]:
        dataloggers: list[HuksefluxHB500] = []

        for nome, equipamento in equipamentos.items():
            if equipamento.get("tipo") != "hukseflux_hb500":
                continue

            dataloggers.append(
                HuksefluxHB500(
                    nome=nome,
                    host=equipamento["host"],
                    porta=equipamento.get("porta", 502),
                    timeout=equipamento.get("timeout", 3.0),
                    device_id=equipamento.get("device_id", 1),
                    endereco_base_ai=equipamento.get("endereco_base_ai", 0),
                    escala_mv=equipamento.get("escala_mv", 1.0),
                    registrador_assinado=equipamento.get(
                        "registrador_assinado",
                        equipamento.get("signed", False),
                    ),
                    canais=equipamento.get("canais"),
                )
            )

        return dataloggers

    @staticmethod
    def _criar_mqtt_sender(config: dict[str, Any] | None) -> MqttSender | None:
        if not config or not config.get("habilitado", False):
            return None

        return MqttSender(
            broker=config.get("broker", "broker.hivemq.com"),
            porta=config.get("porta", 1883),
            topico=config.get("topico", "usina/estacao/dados"),
            client_id=config.get("client_id"),
            keepalive=config.get("keepalive", 60),
        )

    def _coletar_e_salvar(
        self,
        equipamento: str,
        coletor: Callable[[], dict[str, int | float]],
        publicar_mqtt: bool = False,
    ) -> None:
        try:
            dados = coletor()
        except Exception as exc:
            print(f"Falha ao ler {equipamento}: {exc}")
            return

        self.logger.salvar_leitura(equipamento, dados)
        print(f"Dados salvos para {equipamento}: {dados}")

        if publicar_mqtt and self.mqtt_sender is not None:
            self.mqtt_sender.publicar_dados(equipamento=equipamento, dados=dados)
            print(f"Dados publicados via MQTT para {equipamento}.")


if __name__ == "__main__":
    SistemaScada().executar()
