from __future__ import annotations

import json
from typing import Any, Mapping

import paho.mqtt.client as mqtt


class MqttSender:
    """Publica dados coletados em um broker MQTT remoto."""

    def __init__(
        self,
        broker: str = "broker.hivemq.com",
        porta: int = 1883,
        topico: str = "usina/estacao/dados",
        client_id: str | None = "sistema-scada",
        keepalive: int = 60,
    ) -> None:
        self.broker = broker
        self.porta = porta
        self.topico = topico
        self.keepalive = keepalive
        self.cliente = mqtt.Client(client_id=client_id or "", protocol=mqtt.MQTTv311)
        self._conectado = False

    def conectar(self) -> None:
        """Inicia uma conexao de saida com a nuvem, evitando necessidade de NAT inbound."""
        if self._conectado:
            return

        self.cliente.connect(self.broker, self.porta, self.keepalive)
        self.cliente.loop_start()
        self._conectado = True

    def publicar_dados(self, equipamento: str, dados: Mapping[str, Any]) -> None:
        """Publica as leituras da Estacao Solar como JSON."""
        self.conectar()
        payload = json.dumps(
            {
                "equipamento": equipamento,
                "dados": dados,
            },
            ensure_ascii=False,
        )
        resultado = self.cliente.publish(self.topico, payload=payload, qos=1)
        resultado.wait_for_publish()

        if resultado.rc != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"Falha ao publicar dados MQTT no topico {self.topico}: rc={resultado.rc}")

    def desconectar(self) -> None:
        """Fecha a conexao MQTT quando o sistema finalizar."""
        if not self._conectado:
            return

        self.cliente.loop_stop()
        self.cliente.disconnect()
        self._conectado = False
