const debounce = (func: () => void, wait: number, immediate: boolean) => {
  var timeout;

  return function executedFunction() {
    var context = this;
    var args = arguments;

    var later = function () {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };

    var callNow = immediate && !timeout;

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };
};

const search = (inputClass: string, targetUl: string) => {
  const input = <HTMLInputElement>document.querySelector(inputClass);
  const ul = document.querySelector(targetUl);
  if (input && ul) {
    input.onkeyup = () => {
      const filter = input.value.toUpperCase();
      debounce(
        () => {
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
        },
        200,
        false
      )();
    };
  }
};

export { search };
