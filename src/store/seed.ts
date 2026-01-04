export const seed = {
  users: [
    { id: "usr_1", type: "RUT" as const, identifier: "123456785", password: "123456", name: "Juan Pérez", blocked: false },
    { id: "usr_2", type: "EMAIL" as const, identifier: "qa@demo.cl", password: "123456", name: "QA Demo", blocked: false },
    { id: "usr_3", type: "RUT" as const, identifier: "111111111", password: "123456", name: "Blocked User", blocked: true }
  ]
};

  