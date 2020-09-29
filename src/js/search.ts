const search = (inputClass: string, targetUl: string) => {
  const input = <HTMLInputElement>document.querySelector(inputClass);
  const ul = document.querySelector(targetUl);
  if (input && ul) {
    input.onkeyup = () => {
      const filter = input.value.toUpperCase();
      ul.querySelectorAll("li").forEach((el) => {
        el.classList.remove("visible");
        el.classList.remove("hidden");

        el.querySelectorAll("a").forEach((a) => {
          const txtValue = a.textContent || a.innerText;
          if (txtValue.toUpperCase().indexOf(filter) > -1) {
            el.classList.add("visible");
          } else {
            el.classList.add("hidden");
          }
        });
      });
    };
  }
};

export { search };
