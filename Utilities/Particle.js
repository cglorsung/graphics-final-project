/** 
 * Final Project implemented and built by Conor Lorsung
 * 
 */

function Particle(x, y, life, angle, speed, size, color) {
    this.position = {
        x: x,
        y: y
    };

    this.life = life;

    var angle = angle * Math.PI / 180;

    this.velocity = {
        x: speed * Math.cos(angle);
        y: -speed * Math.sin(angle);
    };
    
    this.oLife = this.life = life;
    this.color = color;
    this.oSize = size;
    this.alpha = 1;

}

Particle.prototype.update = function(sec) {
    this.life -= sec;
    
    if(this.life > 0) {
        var ageRatio = this.life / this.oLife;
        this.size = this.size / ageRatio;
        this.alpha = ageRatio;

        this.position.x += this.velocity.x * sec;
        this.position.y += this.velocity.y * sec;
    }
};

for(var i = 0, len = particles.length; i < l; ++i) {
    particles[i].update(delta);
}