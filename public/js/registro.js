function verPasswords() {
    const Passwords = document.getElementById("contraseña")
    const ver = document.getElementById("eyes")
    if (Passwords.type == "password") {
        Passwords.type = "text";
        ver.className = "fa-sharp fa-solid fa-eye";
    } else {
        Passwords.type = "password";
        ver.className = "fa-solid fa-eye-slash";
    }
}

document.addEventListener('DOMContentLoaded', function () {
    let toastElList = [].slice.call(document.querySelectorAll('.toast'))
    let toastList = toastElList.map(function (toastEl) {
        return new bootstrap.Toast(toastEl)
    });
    toastList.forEach(toast => toast.show());
});