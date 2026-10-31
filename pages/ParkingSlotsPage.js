
class ParkingSlotsPage {
    constructor(page) {
        this.page = page;

        // Parking slot filters
        this.stateDropdown = page.locator('select[name="state"]');
        this.cityDropdown = page.locator('select[name="city"]');
        this.locationTypeDropdown = page.locator('select[name="locationType"]');
        this.locationDropdown = page.locator('select[name="location"]');
        this.vehicleTypeDropdown = page.locator('select[name="vehicleType"]');
        this.availabilityDropdown = page.locator('select[name="available"]');
        this.bookButtons = page.locator('button.book-button');
        this.availabilityDropdown = page.locator('select[name="available"]');
        this.slotCards = page.locator('.slot-card');
        this.slotNumbers = page.locator('p').filter({

        });

        this.selectedSlotDetails = page.locator('p.text-primary-100.mt-1');

        // Parking slot results
        this.resultCount = page.locator('p.result-count');
        this.slotNumbers = page.locator('p').filter({
            has: page.locator('span.label', { hasText: 'Slot Number:' })
        });
    }

    async open() {
        await this.page.goto('/slots');
    }

    async selectState(state) {
        await this.stateDropdown.selectOption({ label: state });
    }

    async selectCity(city) {
        await this.cityDropdown.selectOption({ label: city });
    }
    async showAllSlots() {
    await this.availabilityDropdown.selectOption({ label: 'All Slots' });
}
}

export default ParkingSlotsPage;
