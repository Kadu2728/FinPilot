// ======================================================
// FinPilot - Perfil
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  carregarPerfil();
  configurarUploadAvatar();
  configurarFormularioPerfil();
  configurarFormularioSenha();
  configurarToggleSenha();
  configurarPreferencias();
  configurarLogout();
});

// ======================================================
// ELEMENTOS
// ======================================================

const avatarInput = document.getElementById("avatar-file-input");
const avatarBtn = document.getElementById("avatar-upload-btn");

const displayName = document.getElementById("display-name");
const displayEmail = document.getElementById("display-email");

const metaNome = document.getElementById("meta-nome-full");
const metaEmail = document.getElementById("meta-email");

const sidebarName = document.getElementById("sidebar-user-name");
const sidebarEmail = document.getElementById("sidebar-user-email");

const avatarWrap = document.getElementById("avatar-wrap");

// ======================================================
// DADOS
// ======================================================

function obterUsuario() {
  return JSON.parse(localStorage.getItem("finpilot_user")) || {
    nome: "Seu nome",
    apelido: "Seu Apelido",
    email: "seu@email.com",
    avatar: null,
    criadoEm: new Date().toLocaleDateString("pt-BR")
  };
}

function salvarUsuario(usuario) {
  localStorage.setItem(
    "finpilot_user",
    JSON.stringify(usuario)
  );
}

// ======================================================
// CARREGAR PERFIL
// ======================================================

function carregarPerfil() {
  const usuario = obterUsuario();

  displayName.textContent =
    usuario.apelido || usuario.nome;

  displayEmail.textContent =
    usuario.email;

  metaNome.textContent =
    usuario.nome;

  metaEmail.textContent =
    usuario.email;

  sidebarName.textContent =
    usuario.apelido || usuario.nome;

  sidebarEmail.textContent =
    usuario.email;

  document.getElementById("inp-nome").value =
    usuario.nome;

  document.getElementById("inp-apelido").value =
    usuario.apelido || "";

  document.getElementById("inp-email").value =
    usuario.email;

  document.getElementById("meta-since").textContent =
    usuario.criadoEm;

  atualizarAvatar(usuario.avatar);
}

// ======================================================
// AVATAR
// ======================================================

function configurarUploadAvatar() {
  avatarBtn?.addEventListener("click", () => {
    avatarInput.click();
  });

  avatarInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const usuario = obterUsuario();

      usuario.avatar = reader.result;

      salvarUsuario(usuario);

      atualizarAvatar(reader.result);

      mostrarToast("Foto atualizada com sucesso");
    };

    reader.readAsDataURL(file);
  });
}

function atualizarAvatar(src) {
  const antigo = document.getElementById("avatar-img");

  if (antigo) antigo.remove();

  const placeholder =
    document.getElementById("avatar-placeholder");

  if (src) {
    placeholder.style.display = "none";

    const img = document.createElement("img");

    img.src = src;
    img.id = "avatar-img";
    img.className = "avatar-img";

    avatarWrap.prepend(img);
  } else {
    placeholder.style.display = "flex";

    const usuario = obterUsuario();

    placeholder.textContent =
      (usuario.apelido || usuario.nome)
        .charAt(0)
        .toUpperCase();
  }
}

// ======================================================
// PERFIL
// ======================================================

function configurarFormularioPerfil() {
  const form =
    document.getElementById("form-perfil");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const nome =
      document.getElementById("inp-nome").value.trim();

    const apelido =
      document.getElementById("inp-apelido").value.trim();

    if (!nome) {
      mostrarToast("Informe seu nome");
      return;
    }

    const usuario = obterUsuario();

    usuario.nome = nome;
    usuario.apelido = apelido;

    salvarUsuario(usuario);

    carregarPerfil();

    mostrarToast("Perfil atualizado");
  });
}

// ======================================================
// SENHA
// ======================================================

function configurarFormularioSenha() {
  const form =
    document.getElementById("form-senha");

  const novaSenha =
    document.getElementById("inp-senha-nova");

  novaSenha?.addEventListener(
    "input",
    atualizarForcaSenha
  );

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const atual =
      document.getElementById(
        "inp-senha-atual"
      ).value;

    const nova =
      document.getElementById(
        "inp-senha-nova"
      ).value;

    const confirmar =
      document.getElementById(
        "inp-senha-conf"
      ).value;

    if (nova.length < 6) {
      mostrarToast(
        "A senha precisa ter pelo menos 6 caracteres"
      );
      return;
    }

    if (nova !== confirmar) {
      mostrarToast(
        "As senhas não coincidem"
      );
      return;
    }

    localStorage.setItem(
      "finpilot_password",
      nova
    );

    form.reset();

    mostrarToast(
      "Senha alterada com sucesso"
    );
  });
}

// ======================================================
// FORÇA DA SENHA
// ======================================================

function atualizarForcaSenha() {
  const senha =
    document.getElementById(
      "inp-senha-nova"
    ).value;

  const wrap =
    document.getElementById(
      "pw-strength-wrap"
    );

  const barra =
    document.getElementById(
      "pw-strength-bar"
    );

  const label =
    document.getElementById(
      "pw-strength-label"
    );

  wrap.style.display = senha
    ? "block"
    : "none";

  let score = 0;

  if (senha.length >= 6) score++;
  if (/[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha))
    score++;

  const niveis = [
    { texto: "Fraca", largura: 25 },
    { texto: "Regular", largura: 50 },
    { texto: "Boa", largura: 75 },
    { texto: "Forte", largura: 100 }
  ];

  if (score === 0) {
    barra.style.width = "0%";
    label.textContent = "-";
    return;
  }

  barra.style.width =
    niveis[score - 1].largura + "%";

  label.textContent =
    niveis[score - 1].texto;
}

// ======================================================
// MOSTRAR SENHA
// ======================================================

function configurarToggleSenha() {
  document
    .querySelectorAll(".toggle-pw")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const input =
          document.getElementById(
            btn.dataset.target
          );

        input.type =
          input.type === "password"
            ? "text"
            : "password";
      });
    });
}

// ======================================================
// PREFERÊNCIAS
// ======================================================

function configurarPreferencias() {
  const notif =
    document.getElementById("pref-notif");

  const metas =
    document.getElementById("pref-metas");

  notif.checked =
    localStorage.getItem(
      "pref_notificacoes"
    ) === "true";

  metas.checked =
    localStorage.getItem(
      "pref_metas"
    ) !== "false";

  notif.addEventListener(
    "change",
    () => {
      localStorage.setItem(
        "pref_notificacoes",
        notif.checked
      );
    }
  );

  metas.addEventListener(
    "change",
    () => {
      localStorage.setItem(
        "pref_metas",
        metas.checked
      );
    }
  );
}

// ======================================================
// LOGOUT
// ======================================================

function configurarLogout() {
  const botoes = [
    "logout-btn",
    "btn-logout-side",
    "btn-logout-danger"
  ];

  botoes.forEach((id) => {
    const btn =
      document.getElementById(id);

    btn?.addEventListener(
      "click",
      logout
    );
  });
}

function logout() {
  if (
    !confirm(
      "Deseja realmente sair da conta?"
    )
  )
    return;

  localStorage.removeItem(
    "finpilot_token"
  );

  window.location.href =
    "login.html";
}

// ======================================================
// TOAST
// ======================================================

function mostrarToast(mensagem) {
  if (typeof showToast === "function") {
    showToast(mensagem);
    return;
  }

  alert(mensagem);
}