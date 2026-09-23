<script setup>
import { ref, onMounted } from "vue";
import { api, act, money } from "./api";
const subs = ref([]),
  invoices = ref([]),
  summary = ref({}),
  customer = ref("Örnek Teknoloji"),
  amount = ref(990),
  interval = ref("month"),
  period = ref(new Date().toISOString().slice(0, 7));
async function load() {
  [subs.value, invoices.value, summary.value] = await Promise.all([
    api("/subscriptions"),
    api("/invoices"),
    api("/summary"),
  ]);
}
const create = () =>
  act(async () => {
    await api("/subscriptions", "POST", {
      customer: customer.value,
      amount: Math.round(amount.value * 100),
      interval: interval.value,
    });
    await load();
  });
const invoice = (s) =>
  act(async () => {
    await api("/invoices", "POST", {
      subscriptionId: s.id,
      period: period.value,
    });
    await load();
  });
const pay = (i) =>
  act(async () => {
    await api("/payment-events", "POST", {
      invoiceId: i.id,
      eventId: "demo-" + i.id,
    });
    await load();
  });
onMounted(() => act(load, ""));
</script>
<template>
  <div class="grid">
    <div class="panel">
      <p class="muted">AYLIK TEKRARLAYAN GELİR</p>
      <div class="stat">{{ money(summary.mrr || 0) }}</div>
      <p>{{ summary.active || 0 }} aktif abonelik · yıllık plan / 12</p>
    </div>
    <form class="panel" @submit.prevent="create">
      <h2>Abonelik oluştur</h2>
      <label>Müşteri<input v-model="customer" required /></label>
      <div class="toolbar">
        <label
          >Tutar (TL)<input
            type="number"
            v-model="amount"
            min="1"
            step="0.01" /></label
        ><label
          >Dönem<select v-model="interval">
            <option value="month">Aylık</option>
            <option value="year">Yıllık</option>
          </select></label
        ><button>Ekle</button>
      </div>
    </form>
  </div>
  <section class="panel">
    <h2>Abonelikler</h2>
    <label>Fatura dönemi<input type="month" v-model="period" /></label>
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Müşteri</th>
            <th>Tutar</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in subs" :key="s.id">
            <td>{{ s.customer }}</td>
            <td>{{ money(s.amount) }} / {{ s.interval }}</td>
            <td>{{ s.active ? "Aktif" : "Pasif" }}</td>
            <td class="actions">
              <button @click="invoice(s)">Fatura oluştur</button
              ><button
                class="ghost"
                @click="
                  act(async () => {
                    await api('/subscriptions/' + s.id, 'PATCH', {
                      active: !s.active,
                    });
                    await load();
                  })
                "
              >
                Durumu değiştir
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!subs.length" class="empty">İlk aboneliğini oluştur.</p>
  </section>
  <section class="panel">
    <h2>Faturalar · ödeme simülatörü</h2>
    <div v-for="i in invoices" :key="i.id" class="card">
      <div class="toolbar">
        <span
          >{{ i.customer }} · {{ i.period }} · {{ money(i.amount) }} ·
          {{ i.status }}</span
        ><button @click="pay(i)">
          {{
            i.status === "paid"
              ? "Aynı olayı tekrar gönder"
              : "Ödendi olayını gönder"
          }}
        </button>
      </div>
    </div>
    <p class="muted">
      Gerçek tahsilat yapılmaz. Tekrar gönderim aynı olay kimliğini kullanır.
    </p>
  </section>
</template>
