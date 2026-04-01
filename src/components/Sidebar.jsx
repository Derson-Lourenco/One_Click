// src/components/Sidebar.jsx
import React from "react";
import {useAuth} from "../hooks/useAuth";
import logo from "../assets/Logo.png";



const Sidebar = ({activeTab, onTabChange}) => {
    const {user, logout} = useAuth();
    const isAnderson = user?.email === "anderson.vtx@gmail.com";
    const userName = user?.nome || user?.email?.split("@")[0] || "Usuário";

    const handleTabChange = (tab) => {
        if (onTabChange && typeof onTabChange === "function") {
            onTabChange(tab);
        } else {
            console.error("onTabChange is not a function or is undefined");
        }
    };

    return (
        <aside className="sidebar" id="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <img src={logo} alt="VTX" className="logo-img" />
                </div>
            </div>

            <div className="sidebar-user">
                <div className="user-avatar">
                    <i className="fas fa-user-circle"></i>
                </div>
                <div className="user-info">
                    <span className="user-name">{userName}</span>
                    <span className="user-role">Técnico Interno</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    <li
                        className={`nav-item ${activeTab === "ativacao" ? "active" : ""}`}
                        onClick={() => handleTabChange("ativacao")}
                    >
                        <i className="fas fa-clipboard-list"></i>
                        <span>Relatório / Retirada</span>
                    </li>

                    {isAnderson && (
                        <li
                            className={`nav-item ${activeTab === "busca" ? "active" : ""}`}
                            onClick={() => handleTabChange("busca")}
                        >
                            <i className="fas fa-chart-line"></i>
                            <span>Busca</span>
                        </li>
                    )}

                    {isAnderson && (
                        <li
                            className={`nav-item ${activeTab === "produtividade" ? "active" : ""}`}
                            onClick={() => handleTabChange("produtividade")}
                        >
                            <i className="fas fa-chart-bar"></i>
                            <span>Produtividade</span>
                        </li>
                    )}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={logout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </button>
                <div className="sidebar-version">v3.0.0</div>
            </div>
        </aside>
    );
};

export default Sidebar;
