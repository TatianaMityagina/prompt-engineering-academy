import type { Router } from 'vue-router'

const HEADER_OFFSET = 80
const RETRY_DELAYS = [0, 120, 350, 700]

/** Повторы нужны: пока открыт drawer, прокрутка body заблокирована, а статья может ещё рендериться. */
export function scrollToAnchor(id: string) {
  let flashed = false
  for (const delay of RETRY_DELAYS) {
    setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      if (Math.abs(el.getBoundingClientRect().top - HEADER_OFFSET) > 40) {
        el.scrollIntoView({ block: 'start' })
      }
      if (!flashed) {
        flashed = true
        el.classList.add('section-flash')
        setTimeout(() => el.classList.remove('section-flash'), 1600)
      }
    }, delay)
  }
}

/** При переходе на текущий URL роутер не реагирует, поэтому прокрутка выполняется вручную. */
export function navigateTo(router: Router, target: string) {
  const [, hash] = target.split('#')
  if (router.currentRoute.value.fullPath === target && hash) {
    scrollToAnchor(hash)
  } else {
    router.push(target)
  }
}
