from __future__ import annotations

from dataclasses import dataclass

import streamlit as st
from streamlit_option_menu import option_menu

from main import SistemaScada


@dataclass(frozen=True)
class Usina:
    nome: str
    cidade: str
    potencia_kwp: float
    geracao_percentual: int
    status: str


USINAS = [
    Usina("UFV Manga Grande 01", "Janauba - MG", 742.5, 82, "Online"),
    Usina("UFV Manga Grande 02", "Janauba - MG", 618.0, 74, "Online"),
    Usina("UFV Rio Verde", "Rio Verde - GO", 521.4, 58, "Online"),
    Usina("UFV Sertao Azul", "Petrolina - PE", 430.0, 0, "Offline"),
]

DADOS_HB500_FALLBACK = {
    "irradiancia_ghi_wm2": 812.5,
    "irradiancia_poa_wm2": 735.2,
    "temperatura_ar_c": 26.7,
    "temperatura_painel_c": 44.5,
}


def main() -> None:
    st.set_page_config(
        page_title="SistemaScada",
        page_icon="☀️",
        layout="wide",
    )
    st.title('Teste')
    aplicar_css()

    with st.sidebar:
        st.markdown("<h2 class='brand'>SistemaScada</h2>", unsafe_allow_html=True)
        pagina = option_menu(
            menu_title=None,
            options=["Resumo Geral", "Usinas", "Configurações", "Cadastrar Nova Usina"],
            icons=["speedometer2", "grid-3x3-gap", "gear", "plus-circle"],
            default_index=0,
            styles={
                "container": {"padding": "0!important", "background-color": "transparent"},
                "icon": {"color": "#f59e0b", "font-size": "18px"},
                "nav-link": {
                    "font-size": "15px",
                    "text-align": "left",
                    "margin": "4px 0",
                    "border-radius": "12px",
                    "--hover-color": "#eef6ff",
                },
                "nav-link-selected": {"background-color": "#0f766e"},
            },
        )

    if pagina == "Resumo Geral":
        render_resumo_geral()
    else:
        render_placeholder(pagina)


def aplicar_css() -> None:
    st.markdown(
        """
        <style>
        .main .block-container {
            padding-top: 2rem;
            background: #f7fafc;
        }
        .brand {
            color: #0f766e;
            font-weight: 800;
            margin: 0 0 1.5rem 0;
        }
        .page-title {
            color: #0f172a;
            font-size: 2.1rem;
            font-weight: 800;
            margin-bottom: 0.25rem;
        }
        .page-subtitle {
            color: #64748b;
            margin-bottom: 1.5rem;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1rem;
            margin-bottom: 1.4rem;
        }
        .metric-card, .station-card, .plant-card {
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
            border: 1px solid rgba(148, 163, 184, 0.16);
            overflow: hidden;
        }
        .metric-card {
            padding: 1.35rem;
            min-height: 126px;
        }
        .metric-label {
            color: #64748b;
            font-size: 0.92rem;
            font-weight: 600;
            overflow-wrap: anywhere;
        }
        .metric-value {
            color: #0f172a;
            font-size: clamp(1.35rem, 2.5vw, 2rem);
            font-weight: 800;
            margin-top: 0.45rem;
            line-height: 1.15;
            overflow-wrap: anywhere;
        }
        .metric-footnote {
            color: #10b981;
            font-size: 0.82rem;
            margin-top: 0.45rem;
        }
        .station-card {
            padding: 1.5rem;
            border-left: 6px solid #f59e0b;
        }
        .station-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .station-metric {
            background: #f8fafc;
            border-radius: 16px;
            padding: 1rem;
        }
        .plant-card {
            padding: 1.25rem;
            margin-bottom: 1rem;
        }
        .plant-title {
            color: #0f172a;
            font-size: 1.05rem;
            font-weight: 800;
        }
        .plant-meta {
            color: #64748b;
            font-size: 0.86rem;
            margin-top: 0.2rem;
        }
        .status-online {
            color: #047857;
            background: #d1fae5;
            border-radius: 999px;
            padding: 0.2rem 0.7rem;
            font-size: 0.78rem;
            font-weight: 700;
        }
        .status-offline {
            color: #b91c1c;
            background: #fee2e2;
            border-radius: 999px;
            padding: 0.2rem 0.7rem;
            font-size: 0.78rem;
            font-weight: 700;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_resumo_geral() -> None:
    dados_hb500, fonte_hb500 = carregar_dados_hb500()
    potencia_total = sum(usina.potencia_kwp for usina in USINAS)
    online = sum(1 for usina in USINAS if usina.status == "Online")
    offline = len(USINAS) - online
    status_estacao = "Online" if fonte_hb500 == "tempo real" else "Simulado"

    st.markdown("<div class='page-title'>Resumo Geral</div>", unsafe_allow_html=True)
    st.markdown(
        "<div class='page-subtitle'>Visão operacional das usinas e da estação solar.</div>",
        unsafe_allow_html=True,
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        render_metric_card("Potência Total Instalada", f"{potencia_total:,.1f} kWp", "Portfólio monitorado")
    with col2:
        render_metric_card("Status da Estação Solar", status_estacao, f"Fonte: HB500 ({fonte_hb500})")
    with col3:
        render_metric_card("Usinas Online/Offline", f"{online}/{offline}", "Disponibilidade operacional")

    st.markdown("### Informações da Estação")
    render_station_card(dados_hb500, fonte_hb500)

    st.markdown("### Lista de Usinas")
    render_usinas_grid()


def carregar_dados_hb500() -> tuple[dict[str, float], str]:
    try:
        sistema = SistemaScada("config.yaml")
        if not sistema.hukseflux_hb500:
            return DADOS_HB500_FALLBACK, "amostra"
        return sistema.hukseflux_hb500[0].get_all_data(), "tempo real"
    except Exception:
        return DADOS_HB500_FALLBACK, "amostra"


def render_metric_card(rotulo: str, valor: str, rodape: str) -> None:
    st.markdown(
        f"""
        <div class='metric-card'>
            <div class='metric-label'>{rotulo}</div>
            <div class='metric-value'>{valor}</div>
            <div class='metric-footnote'>{rodape}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_station_card(dados: dict[str, float], fonte: str) -> None:
    st.markdown(
        f"""
        <div class='station-card'>
            <div class='plant-title'>Hukseflux HB500</div>
            <div class='plant-meta'>Dados da estação solar em {fonte}</div>
            <div class='station-grid'>
                <div class='station-metric'>
                    <div class='metric-label'>GHI</div>
                    <div class='metric-value'>{dados['irradiancia_ghi_wm2']:.1f}</div>
                    <div class='metric-footnote'>W/m²</div>
                </div>
                <div class='station-metric'>
                    <div class='metric-label'>POA</div>
                    <div class='metric-value'>{dados['irradiancia_poa_wm2']:.1f}</div>
                    <div class='metric-footnote'>W/m²</div>
                </div>
                <div class='station-metric'>
                    <div class='metric-label'>Temp. Ar</div>
                    <div class='metric-value'>{dados['temperatura_ar_c']:.1f}</div>
                    <div class='metric-footnote'>°C</div>
                </div>
                <div class='station-metric'>
                    <div class='metric-label'>Temp. Painel</div>
                    <div class='metric-value'>{dados['temperatura_painel_c']:.1f}</div>
                    <div class='metric-footnote'>°C</div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_usinas_grid() -> None:
    linhas = [USINAS[indice : indice + 2] for indice in range(0, len(USINAS), 2)]
    for linha in linhas:
        colunas = st.columns(2)
        for coluna, usina in zip(colunas, linha, strict=False):
            with coluna:
                render_usina_card(usina)


def render_usina_card(usina: Usina) -> None:
    status_classe = "status-online" if usina.status == "Online" else "status-offline"
    st.markdown(
        f"""
        <div class='plant-card'>
            <div style='display:flex; justify-content:space-between; align-items:center; gap:1rem;'>
                <div>
                    <div class='plant-title'>{usina.nome}</div>
                    <div class='plant-meta'>{usina.cidade} • {usina.potencia_kwp:.1f} kWp</div>
                </div>
                <span class='{status_classe}'>{usina.status}</span>
            </div>
            <div class='plant-meta' style='margin-top:1rem;'>Geração atual</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.progress(usina.geracao_percentual / 100, text=f"{usina.geracao_percentual}% da geração esperada")


def render_placeholder(pagina: str) -> None:
    st.markdown(f"<div class='page-title'>{pagina}</div>", unsafe_allow_html=True)
    st.info("Tela preparada para expansão nas próximas etapas do SistemaScada.")


if __name__ == "__main__":
    main()
